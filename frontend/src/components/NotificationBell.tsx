import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationRead, type NotificationItem } from '../api/client';
import styles from './NotificationBell.module.css';

export default function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getNotifications()
      .then((r) => setNotifications(r.notifications))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [open]);

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
    setOpen(false);
    navigate(n.link);
  };

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
      return d.toLocaleDateString();
    } catch (_) {
      return '';
    }
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.bell}
        onClick={() => setOpen((o) => !o)}
        aria-label={unreadCount > 0 ? `${unreadCount} notifications` : 'Notifications'}
        title="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <strong>Notifications</strong>
            {unreadCount > 0 && <span className={styles.unreadLabel}>{unreadCount} new</span>}
          </div>
          {loading ? (
            <p className={styles.dropdownEmpty}>Loading…</p>
          ) : notifications.length === 0 ? (
            <p className={styles.dropdownEmpty}>No notifications</p>
          ) : (
            <ul className={styles.list}>
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`${styles.item} ${!n.readAt ? styles.unread : ''}`}
                    onClick={() => handleItemClick(n)}
                  >
                    <span className={styles.itemTitle}>
                      {n.type === 'MESSAGE_RECEIVED' && (
                        <span className={styles.messageTag} title="Message">
                          💬{' '}
                        </span>
                      )}
                      {n.title}
                    </span>
                    <span className={styles.itemMessage}>{n.message}</span>
                    <span className={styles.itemTime}>{formatTime(n.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.dropdownFooter}>
            <Link to="/notifications" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
