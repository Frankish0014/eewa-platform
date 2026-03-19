import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from '../api/client';
import styles from './Dashboard.module.css';
import adminStyles from './Admin.module.css';
import bellStyles from '../components/NotificationBell.module.css';
import pageStyles from './NotificationsPage.module.css';

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch (_) {
    return iso;
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = () => {
    setLoading(true);
    getNotifications()
      .then((r) => setNotifications(r.notifications))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const handleItemClick = async (n: NotificationItem) => {
    if (!n.readAt) {
      try {
        await markNotificationRead(n.id);
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
        );
      } catch (_) {
        // keep UI as is
      }
    }
    navigate(n.link);
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() }))
      );
    } catch (_) {
      // keep UI as is
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div>
      <h1 className={styles.pageTitle}>Notifications</h1>
      <p className={styles.pageSubtitle}>
        See what needs your attention. Click a notification to go to the relevant page.
      </p>
      <Link to="/">← Dashboard</Link>

      <div className={adminStyles.card} style={{ marginTop: '1.5rem' }}>
        {unreadCount > 0 && (
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className={adminStyles.btnSecondary}
              onClick={handleMarkAllRead}
              disabled={markingAll}
            >
              {markingAll ? '…' : 'Mark all as read'}
            </button>
          </div>
        )}
        {loading ? (
          <p className={adminStyles.loading}>Loading…</p>
        ) : notifications.length === 0 ? (
          <p className={adminStyles.empty}>No notifications yet.</p>
        ) : (
          <ul className={`${bellStyles.list} ${pageStyles.notificationsList}`} style={{ padding: 0 }}>
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={`${bellStyles.item} ${!n.readAt ? bellStyles.unread : ''}`}
                  onClick={() => handleItemClick(n)}
                  style={{
                    width: '100%',
                    borderBottom: '1px solid var(--border)',
                    borderRadius: 0,
                  }}
                >
                  <span className={bellStyles.itemTitle}>{n.title}</span>
                  <span className={bellStyles.itemMessage}>{n.message}</span>
                  <span className={bellStyles.itemTime}>{formatTime(n.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
