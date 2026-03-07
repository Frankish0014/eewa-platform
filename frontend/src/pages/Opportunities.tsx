import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getVerifiedOpportunities, getSectors, type Opportunity, type Sector } from '../api/client';
import styles from './Dashboard.module.css';
import adminStyles from './Admin.module.css';

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [sectorId, setSectorId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSectors().then((r) => setSectors(r.sectors)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getVerifiedOpportunities(sectorId || undefined)
      .then((r) => setOpportunities(r.opportunities))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [sectorId]);

  return (
    <div>
      <h1 className={styles.pageTitle}>Opportunities</h1>
      <p className={styles.pageSubtitle}>
        Browse verified opportunities by sector. Filter by your venture’s sector to find relevant funding and programs.
      </p>
      <Link to="/">← Dashboard</Link>

      {error && <p className={adminStyles.error}>{error}</p>}

      <div className={styles.section} style={{ marginTop: '1.5rem' }}>
        <label className={styles.label} htmlFor="sector-filter">Filter by sector</label>
        <select
          id="sector-filter"
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

      <div className={adminStyles.card} style={{ marginTop: '1rem' }}>
        {loading ? (
          <p className={adminStyles.loading}>Loading…</p>
        ) : opportunities.length === 0 ? (
          <p className={adminStyles.empty}>
            {sectorId ? 'No verified opportunities in this sector yet.' : 'No verified opportunities yet.'}
          </p>
        ) : (
          <>
            <p className={styles.welcome} style={{ marginBottom: '1rem' }}>
              <strong>{opportunities.length}</strong> opportunity{opportunities.length !== 1 ? 'ies' : ''} found
              {sectorId && sectors.find((s) => s.id === sectorId) && (
                <> in <strong>{sectors.find((s) => s.id === sectorId)!.name}</strong></>
              )}.
            </p>
            <div className={adminStyles.tableWrap}>
              <table className={adminStyles.table}>
                <thead>
                  <tr>
                    <th>Sector</th>
                    <th>Title</th>
                    <th>Description</th>
                    <th>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <span style={{ fontWeight: 500 }}>{o.sectorName}</span>
                      </td>
                      <td><strong>{o.title}</strong></td>
                      <td style={{ maxWidth: '320px' }}>
                        {o.description ? (
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{o.description}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {o.link ? (
                          <a href={o.link} target="_blank" rel="noopener noreferrer" className={styles.editBtn} style={{ textDecoration: 'none' }}>
                            Open
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
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
