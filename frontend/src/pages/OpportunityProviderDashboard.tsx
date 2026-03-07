import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getMyOpportunities,
  getProviderVenturesOverview,
  type Opportunity,
  type VenturesOverview,
} from '../api/client';
import styles from './Dashboard.module.css';
import adminStyles from './Admin.module.css';

export default function OpportunityProviderDashboard() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [overview, setOverview] = useState<VenturesOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getMyOpportunities(), getProviderVenturesOverview()])
      .then(([oppRes, ventRes]) => {
        setOpportunities(oppRes.opportunities);
        setOverview(ventRes.overview);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <p className={adminStyles.error}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>Opportunity provider dashboard</h1>
      <p className={styles.pageSubtitle}>
        Serve entrepreneurs on the platform — post opportunities and discover ventures.
      </p>

      <div className={styles.hero}>
        <h2>Welcome back, {user?.email}</h2>
        <p className={styles.welcome}>
          Use this dashboard to manage your opportunities and explore ventures created by entrepreneurs on EEWA.
        </p>
      </div>

      <section className={styles.section}>
        <h3>Quick actions</h3>
        <ul className={styles.links}>
          <li><Link to="/provider/opportunities">My opportunities</Link></li>
          <li><Link to="/provider/entrepreneurs">Browse entrepreneurs</Link></li>
          <li><Link to="/profile">My profile</Link></li>
        </ul>
      </section>

      {loading ? (
        <p className={adminStyles.loading}>Loading…</p>
      ) : (
        <>
          <section className={styles.section}>
            <h3>My opportunities</h3>
            <p className={styles.welcome}>
              {opportunities.length} opportunity{opportunities.length !== 1 ? 'ies' : ''} posted.
              <Link to="/provider/opportunities"> View all & create new</Link>
            </p>
            {opportunities.length > 0 && (
              <div className={adminStyles.tableWrap}>
                <table className={adminStyles.table}>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Sector</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opportunities.slice(0, 5).map((o) => (
                      <tr key={o.id}>
                        <td>{o.title}</td>
                        <td>{o.sectorName}</td>
                        <td>
                          <span className={o.status === 'VERIFIED' ? adminStyles.badgeVerified : adminStyles.badgePending}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h3>Entrepreneurs on the platform</h3>
            <p className={styles.welcome}>
              {overview ? `${overview.total} venture${overview.total !== 1 ? 's' : ''} — entrepreneurs you can serve.` : '—'}
              <Link to="/provider/entrepreneurs"> Browse all</Link>
            </p>
            {overview && overview.ventures.length > 0 && (
              <div className={adminStyles.tableWrap}>
                <table className={adminStyles.table}>
                  <thead>
                    <tr>
                      <th>Venture</th>
                      <th>Sector</th>
                      <th>Stage</th>
                      <th>Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.ventures.slice(0, 8).map((v) => (
                      <tr key={v.id}>
                        <td>{v.title}</td>
                        <td>{v.sectorName}</td>
                        <td>{v.stage ?? '—'}</td>
                        <td>{v.ownerName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <p className={styles.footer}>
        EEWA — Empowering African entrepreneurs with mentorship and funding.
      </p>
    </div>
  );
}
