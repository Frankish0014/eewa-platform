import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getOpportunitiesPending,
  verifyOpportunity,
  type Opportunity,
} from '../api/client';
import styles from './Admin.module.css';

export default function AdminOpportunities() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const res = await getOpportunitiesPending();
      setOpportunities(res.opportunities);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'Admin') load();
    else setLoading(false);
  }, [user?.role]);

  const handleVerify = async (id: string, approve: boolean) => {
    setVerifyingId(id);
    try {
      await verifyOpportunity(id, approve);
      setOpportunities((prev) => prev.filter((o) => o.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setVerifyingId(null);
    }
  };

  if (user?.role !== 'Admin') {
    return (
      <div className={styles.card}>
        <p className={styles.error}>Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>Verify opportunities</h1>
      <p className={styles.pageSubtitle}>
        Review pending opportunities before they are visible to users.
      </p>
      <Link to="/">← Dashboard</Link>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.card}>
        {loading ? (
          <p className={styles.loading}>Loading…</p>
        ) : opportunities.length === 0 ? (
          <p className={styles.empty}>No pending opportunities.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Sector</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <strong>{o.title}</strong>
                      {o.description && (
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--muted)' }}>
                          {o.description.slice(0, 80)}
                          {o.description.length > 80 ? '…' : ''}
                        </p>
                      )}
                    </td>
                    <td>{o.sectorName}</td>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.btnPrimary}
                        disabled={verifyingId === o.id}
                        onClick={() => handleVerify(o.id, true)}
                      >
                        {verifyingId === o.id ? '…' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        className={styles.btnDanger}
                        disabled={verifyingId === o.id}
                        onClick={() => handleVerify(o.id, false)}
                      >
                        Reject
                      </button>
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
