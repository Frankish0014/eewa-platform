import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAdminVenturesOverview, type VenturesOverview } from '../api/client';
import styles from './Admin.module.css';

export default function AdminVentures() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<VenturesOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'Admin') {
      setLoading(false);
      return;
    }
    getAdminVenturesOverview()
      .then((res) => setOverview(res.overview))
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
      <h1 className={styles.pageTitle}>Ventures overview</h1>
      <p className={styles.pageSubtitle}>
        Review how many ventures users have created and key details. Admins do not create ventures.
      </p>
      <Link to="/">← Dashboard</Link>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.card}>
        {loading ? (
          <p className={styles.loading}>Loading…</p>
        ) : !overview ? (
          <p className={styles.empty}>No data.</p>
        ) : (
          <>
            <h3 style={{ marginTop: 0 }}>Summary</h3>
            <p><strong>Total ventures:</strong> {overview.total}</p>

            <h3>Ventures per user</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Ventures</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.byUser.map((u) => (
                    <tr key={u.userId}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>{u.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {overview.byUser.length === 0 && <p className={styles.empty}>No users with ventures yet.</p>}

            <h3>All ventures (key details)</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Sector</th>
                    <th>Status</th>
                    <th>Stage</th>
                    <th>Country</th>
                    <th>Owner</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.ventures.map((v) => (
                    <tr key={v.id}>
                      <td><strong>{v.title}</strong></td>
                      <td>{v.sectorName}</td>
                      <td>{v.status}</td>
                      <td>{v.stage ?? '—'}</td>
                      <td>{v.country ?? '—'}</td>
                      <td>{v.ownerName} ({v.ownerEmail})</td>
                      <td>{new Date(v.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {overview.ventures.length === 0 && <p className={styles.empty}>No ventures yet.</p>}
          </>
        )}
      </div>
    </div>
  );
}
