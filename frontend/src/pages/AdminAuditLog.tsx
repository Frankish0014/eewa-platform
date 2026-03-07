import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAuditLog, type AuditLogEntry } from '../api/client';
import styles from './Admin.module.css';

export default function AdminAuditLog() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'Admin') {
      setLoading(false);
      return;
    }
    getAuditLog(200)
      .then((res) => setEntries(res.auditLog))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [user?.role]);

  if (user?.role !== 'Admin') {
    return (
      <div className={styles.card}>
        <p className={styles.error}>Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>Audit log</h1>
      <p className={styles.pageSubtitle}>
        Recent platform actions (logins, project edits, mentor actions, opportunity reviews).
      </p>
      <Link to="/">← Dashboard</Link>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.card}>
        {loading ? (
          <p className={styles.loading}>Loading…</p>
        ) : entries.length === 0 ? (
          <p className={styles.empty}>No audit entries yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(e.createdAt).toLocaleString()}</td>
                    <td>{e.userEmail}</td>
                    <td>{e.action}</td>
                    <td>{e.resourceType}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                      {e.resourceId ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
