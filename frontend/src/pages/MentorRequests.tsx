import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getMentorRequests,
  respondToMentorRequest,
  type MentorRequestItem,
} from '../api/client';
import styles from './Dashboard.module.css';
import adminStyles from './Admin.module.css';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch (_) {
    return iso;
  }
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'REQUESTED'
      ? adminStyles.badgePending
      : status === 'ACTIVE'
        ? adminStyles.badgeVerified
        : adminStyles.badgeMuted;
  return <span className={`${adminStyles.badge} ${cls}`}>{status}</span>;
}

export default function MentorRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MentorRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getMentorRequests()
      .then((r) => setRequests(r.requests))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user?.role !== 'Mentor') {
      setLoading(false);
      return;
    }
    load();
  }, [user?.role]);

  const handleRespond = async (assignmentId: string, accept: boolean) => {
    setRespondingId(assignmentId);
    try {
      await respondToMentorRequest(assignmentId, accept);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === assignmentId ? { ...r, status: accept ? 'ACTIVE' : 'REJECTED' } : r
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setRespondingId(null);
    }
  };

  if (user?.role !== 'Mentor') {
    return (
      <div className={adminStyles.card}>
        <p className={adminStyles.error}>Access denied. Mentors only.</p>
      </div>
    );
  }

  const pendingCount = requests.filter((r) => r.status === 'REQUESTED').length;

  return (
    <div>
      <h1 className={styles.pageTitle}>Mentorship requests</h1>
      <p className={styles.pageSubtitle}>
        View and respond to requests from entrepreneurs who want you as their mentor.
        {pendingCount > 0 && (
          <strong style={{ color: 'var(--accent)', marginLeft: '0.5rem' }}>
            {pendingCount} awaiting your response
          </strong>
        )}
      </p>
      <Link to="/">← Dashboard</Link>

      {error && <p className={adminStyles.error} style={{ marginTop: '1rem' }}>{error}</p>}

      <div className={adminStyles.card} style={{ marginTop: '1.5rem' }}>
        {loading ? (
          <p className={adminStyles.loading}>Loading…</p>
        ) : requests.length === 0 ? (
          <p className={adminStyles.empty}>No mentorship requests yet.</p>
        ) : (
          <ul className={adminStyles.requestList}>
            {requests.map((r) => (
              <li key={r.id} className={adminStyles.requestCard}>
                <div className={adminStyles.requestMain}>
                  <div>
                    <strong>{r.projectTitle}</strong>
                    <span className={adminStyles.requestMeta}>
                      from {r.menteeName} · {formatDate(r.assignedAt)}
                    </span>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                {r.status === 'REQUESTED' && (
                  <div className={adminStyles.requestActions}>
                    <button
                      type="button"
                      className={adminStyles.btnPrimary}
                      disabled={respondingId === r.id}
                      onClick={() => handleRespond(r.id, true)}
                    >
                      {respondingId === r.id ? '…' : 'Accept'}
                    </button>
                    <button
                      type="button"
                      className={adminStyles.btnSecondary}
                      disabled={respondingId === r.id}
                      onClick={() => handleRespond(r.id, false)}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
