import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getProviderVenturesOverview, getSectors, type VenturesOverview, type Sector } from '../api/client';
import styles from './Dashboard.module.css';
import adminStyles from './Admin.module.css';

export default function ProviderEntrepreneurs() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<VenturesOverview | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [sectorId, setSectorId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'OpportunityProvider') {
      setLoading(false);
      return;
    }
    Promise.all([getProviderVenturesOverview(), getSectors()])
      .then(([ventRes, sectorsRes]) => {
        setOverview(ventRes.overview);
        setSectors(sectorsRes.sectors);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [user?.role]);

  const sectorName = sectorId ? sectors.find((s) => s.id === sectorId)?.name : null;
  const filteredVentures = useMemo(() => {
    if (!overview) return [];
    if (!sectorId || !sectorName) return overview.ventures;
    return overview.ventures.filter((v) => v.sectorName === sectorName);
  }, [overview, sectorId, sectorName]);

  const filteredByUser = useMemo(() => {
    if (!overview || !sectorId || !sectorName) return overview?.byUser ?? [];
    const byOwner = new Map<string, { userId: string; email: string; name: string; role: string; count: number }>();
    for (const v of overview.ventures.filter((v) => v.sectorName === sectorName)) {
      const key = v.ownerId;
      if (!byOwner.has(key)) {
        byOwner.set(key, {
          userId: v.ownerId,
          email: v.ownerEmail,
          name: v.ownerName,
          role: v.ownerRole,
          count: 0,
        });
      }
      byOwner.get(key)!.count += 1;
    }
    return Array.from(byOwner.values()).sort((a, b) => b.count - a.count);
  }, [overview, sectorId, sectorName]);

  if (user?.role !== 'OpportunityProvider') {
    return (
      <div className={adminStyles.card}>
        <p className={adminStyles.error}>Access denied. Opportunity providers only.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>Entrepreneurs on the platform</h1>
      <p className={styles.pageSubtitle}>
        Browse ventures created by entrepreneurs — find who you can serve with your opportunities.
      </p>
      <Link to="/">← Dashboard</Link>

      {error && <p className={adminStyles.error}>{error}</p>}

      <div className={styles.section} style={{ marginTop: '1rem' }}>
        <label className={styles.label} htmlFor="provider-sector-filter">Filter by sector</label>
        <select
          id="provider-sector-filter"
          className={styles.input}
          value={sectorId}
          onChange={(e) => setSectorId(e.target.value)}
          style={{ maxWidth: '280px', marginTop: '0.5rem' }}
        >
          <option value="">All sectors</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className={adminStyles.card}>
        {loading ? (
          <p className={adminStyles.loading}>Loading…</p>
        ) : !overview ? (
          <p className={adminStyles.empty}>No data.</p>
        ) : (
          <>
            <h3 style={{ marginTop: 0 }}>Summary</h3>
            <p><strong>Total ventures:</strong> {filteredVentures.length}{sectorId && sectorName ? ` in ${sectorName}` : ''}</p>

            <h3>Ventures per entrepreneur</h3>
            <div className={adminStyles.tableWrap}>
              <table className={adminStyles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Ventures</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredByUser.map((u) => (
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
            {filteredByUser.length === 0 && <p className={adminStyles.empty}>No ventures in this sector.</p>}

            <h3>All ventures (key details)</h3>
            <div className={adminStyles.tableWrap}>
              <table className={adminStyles.table}>
                <thead>
                  <tr>
                    <th>Venture</th>
                    <th>Sector</th>
                    <th>Status</th>
                    <th>Stage</th>
                    <th>Country</th>
                    <th>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVentures.map((v) => (
                    <tr key={v.id}>
                      <td>{v.title}</td>
                      <td>{v.sectorName}</td>
                      <td>{v.status}</td>
                      <td>{v.stage ?? '—'}</td>
                      <td>{v.country ?? '—'}</td>
                      <td>{v.ownerName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
