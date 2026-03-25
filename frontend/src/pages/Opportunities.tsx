import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getVerifiedOpportunities,
  getSectors,
  getProjects,
  applyToOpportunity,
  type Opportunity,
  type Sector,
  type Project,
} from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import styles from './Dashboard.module.css';
import adminStyles from './Admin.module.css';
import modalStyles from './Projects.module.css';

export default function OpportunitiesPage() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sectorId, setSectorId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyOpp, setApplyOpp] = useState<Opportunity | null>(null);
  const [applyProjectId, setApplyProjectId] = useState('');
  const [applyMessage, setApplyMessage] = useState('');
  const [applyAck, setApplyAck] = useState(false);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  useEffect(() => {
    getSectors().then((r) => setSectors(r.sectors)).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.role === 'Student') {
      getProjects().then((r) => setProjects(r.projects)).catch(() => {});
    }
  }, [user?.role]);

  useEffect(() => {
    setLoading(true);
    getVerifiedOpportunities(sectorId || undefined)
      .then((r) => setOpportunities(r.opportunities))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [sectorId]);

  const openApply = (o: Opportunity) => {
    setApplyOpp(o);
    setApplySuccess(null);
    setApplyMessage('');
    setApplyAck(false);
    const inSector = projects.filter((p) => p.sectorId === o.sectorId);
    setApplyProjectId(inSector.length === 1 ? inSector[0].id : '');
    setError(null);
  };

  const closeApply = () => {
    setApplyOpp(null);
    setApplySubmitting(false);
  };

  const submitApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyOpp) return;
    const inSector = projects.filter((p) => p.sectorId === applyOpp.sectorId);
    if (inSector.length === 0) return;
    const primaryProjectId = inSector.length === 1 ? inSector[0].id : applyProjectId;
    if (!primaryProjectId) {
      setError('Select which venture you are applying with.');
      return;
    }
    if (applyOpp.eligibilityCriteria?.trim() && !applyAck) {
      setError('Please confirm you meet the eligibility criteria.');
      return;
    }
    setApplySubmitting(true);
    setError(null);
    try {
      await applyToOpportunity(applyOpp.id, {
        primaryProjectId,
        message: applyMessage.trim() || undefined,
        eligibilityAcknowledged: applyOpp.eligibilityCriteria?.trim() ? applyAck : undefined,
      });
      setApplySuccess('Application submitted. The opportunity provider may follow up using details from your venture.');
      setTimeout(() => closeApply(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apply failed');
    } finally {
      setApplySubmitting(false);
    }
  };

  const isStudent = user?.role === 'Student';

  return (
    <div>
      <h1 className={styles.pageTitle}>Opportunities</h1>
      <p className={styles.pageSubtitle}>
        Browse verified opportunities by sector. Filter by your venture’s sector to find relevant funding and programs.
        Opportunity providers can create and edit their opportunities from <strong>My opportunities</strong> in the sidebar.
        Admins review submissions before they appear here.
      </p>
      <Link to="/">← Dashboard</Link>

      {error && !applyOpp && <p className={adminStyles.error}>{error}</p>}

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
                    {isStudent && <th>Apply</th>}
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <span style={{ fontWeight: 500 }}>{o.sectorName}</span>
                      </td>
                      <td>
                        <strong>{o.title}</strong>
                        {o.requireCompletedMilestone && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Requires a completed milestone on your venture in this sector.
                          </div>
                        )}
                      </td>
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
                      {isStudent && (
                        <td>
                          <button type="button" className={styles.editBtn} onClick={() => openApply(o)}>
                            Apply
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {applyOpp && (
        <div className={modalStyles.overlay} onClick={() => !applySubmitting && closeApply()} role="presentation">
          <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className={modalStyles.header}>
              <h3>Apply: {applyOpp.title}</h3>
              <button type="button" className={modalStyles.close} aria-label="Close" onClick={() => !applySubmitting && closeApply()}>
                ×
              </button>
            </div>
            {applySuccess ? (
              <p className={styles.welcome}>{applySuccess}</p>
            ) : (
              <form onSubmit={submitApply}>
                {error && <p className={adminStyles.error}>{error}</p>}
                {(() => {
                  const inSector = projects.filter((p) => p.sectorId === applyOpp.sectorId);
                  if (inSector.length === 0) {
                    return (
                      <p>
                        You need a venture in <strong>{applyOpp.sectorName}</strong> to apply.{' '}
                        <Link to="/projects">Create or update a venture</Link> with that sector first.
                      </p>
                    );
                  }
                  return (
                    <>
                      {inSector.length > 1 && (
                        <div style={{ marginBottom: '1rem' }}>
                          <label className={styles.label}>Venture in {applyOpp.sectorName}</label>
                          <select
                            className={styles.input}
                            required
                            value={applyProjectId}
                            onChange={(e) => setApplyProjectId(e.target.value)}
                          >
                            <option value="">Select venture…</option>
                            {inSector.map((p) => (
                              <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {applyOpp.eligibilityCriteria?.trim() && (
                        <div style={{ marginBottom: '1rem' }}>
                          <p className={styles.label}>Eligibility</p>
                          <div
                            style={{
                              fontSize: '0.9rem',
                              padding: '0.75rem',
                              background: 'var(--surface-elevated, #f5f5f5)',
                              borderRadius: '6px',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {applyOpp.eligibilityCriteria}
                          </div>
                          <label style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'flex-start' }}>
                            <input type="checkbox" checked={applyAck} onChange={(e) => setApplyAck(e.target.checked)} />
                            <span>I confirm I meet these requirements.</span>
                          </label>
                        </div>
                      )}
                      <div style={{ marginBottom: '1rem' }}>
                        <label className={styles.label}>Message to provider (optional)</label>
                        <textarea
                          className={styles.input}
                          rows={3}
                          value={applyMessage}
                          onChange={(e) => setApplyMessage(e.target.value)}
                          maxLength={2000}
                          placeholder="Brief note about your fit or questions"
                        />
                      </div>
                      <button type="submit" className={adminStyles.btnPrimary} disabled={applySubmitting}>
                        {applySubmitting ? 'Submitting…' : 'Submit application'}
                      </button>
                      <button
                        type="button"
                        className={adminStyles.btnDanger}
                        style={{ marginLeft: '0.5rem' }}
                        disabled={applySubmitting}
                        onClick={() => closeApply()}
                      >
                        Cancel
                      </button>
                    </>
                  );
                })()}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
