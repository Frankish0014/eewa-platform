import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getMyOpportunities,
  getSectors,
  createOpportunity,
  updateOpportunity,
  getOpportunityApplications,
  type Opportunity,
  type Sector,
  type OpportunityApplicationListItem,
} from '../api/client';
import styles from './Dashboard.module.css';
import adminStyles from './Admin.module.css';
import modalStyles from './Projects.module.css';

function proofLinkLines(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function safeProofHref(line: string): string | null {
  const candidate = line.startsWith('http://') || line.startsWith('https://') ? line : `https://${line}`;
  try {
    const u = new URL(candidate);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch {
    /* ignore */
  }
  return null;
}

function formatVentureStage(s: string | null): string {
  if (!s) return '—';
  const map: Record<string, string> = {
    IDEA: 'Idea',
    PROTOTYPE: 'Prototype',
    MVP: 'MVP',
    REVENUE: 'Revenue',
    SCALING: 'Scaling',
    OTHER: 'Other',
  };
  return map[s] ?? s;
}

export default function ProviderOpportunities() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formSectorId, setFormSectorId] = useState('');
  const [formEligibility, setFormEligibility] = useState('');
  const [formRequireMilestone, setFormRequireMilestone] = useState(false);
  const [appsOpp, setAppsOpp] = useState<Opportunity | null>(null);
  const [applications, setApplications] = useState<OpportunityApplicationListItem[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'OpportunityProvider') {
      setLoading(false);
      return;
    }
    Promise.all([getMyOpportunities(), getSectors()])
      .then(([oppRes, secRes]) => {
        setOpportunities(oppRes.opportunities);
        setSectors(secRes.sectors);
        if (secRes.sectors.length > 0 && !formSectorId) setFormSectorId(secRes.sectors[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [user?.role]);

  useEffect(() => {
    if (!appsOpp) {
      setApplications([]);
      setAppsError(null);
      return;
    }
    setAppsLoading(true);
    setAppsError(null);
    getOpportunityApplications(appsOpp.id)
      .then((r) => setApplications(r.applications))
      .catch((e) => setAppsError(e instanceof Error ? e.message : 'Failed to load applications'))
      .finally(() => setAppsLoading(false));
  }, [appsOpp]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formSectorId) return;
    setSubmitting(true);
    setError(null);
    try {
      await createOpportunity({
        sectorId: formSectorId,
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        link: formLink.trim() || undefined,
        eligibilityCriteria: formEligibility.trim() || undefined,
        requireCompletedMilestone: formRequireMilestone,
      });
      const res = await getMyOpportunities();
      setOpportunities(res.opportunities);
      setShowForm(false);
      setFormTitle('');
      setFormDescription('');
      setFormLink('');
      setFormEligibility('');
      setFormRequireMilestone(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOpportunity) return;
    const title = formTitle.trim();
    const sectorId = formSectorId || sectors[0]?.id;
    if (!title || !sectorId) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateOpportunity(editingOpportunity.id, {
        sectorId,
        title,
        description: formDescription.trim() || undefined,
        link: formLink.trim() || undefined,
        eligibilityCriteria: formEligibility.trim() || undefined,
        requireCompletedMilestone: formRequireMilestone,
      });
      const res = await getMyOpportunities();
      setOpportunities(res.opportunities);
      setEditingOpportunity(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (opp: Opportunity) => {
    setEditingOpportunity(opp);
    setFormTitle(opp.title);
    setFormDescription(opp.description ?? '');
    setFormLink(opp.link ?? '');
    setFormSectorId(opp.sectorId);
    setFormEligibility(opp.eligibilityCriteria ?? '');
    setFormRequireMilestone(opp.requireCompletedMilestone ?? false);
    setError(null);
  };

  if (user?.role !== 'OpportunityProvider' && user?.role !== 'InstitutionStaff') {
    return (
      <div className={adminStyles.card}>
        <p className={adminStyles.error}>Access denied. Opportunity providers and institution partners only.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>My opportunities</h1>
      <p className={styles.pageSubtitle}>
        Create and manage opportunities for entrepreneurs. Pending items are reviewed by admins before going live.
      </p>
      <Link to="/">← Dashboard</Link>

      {error && <p className={adminStyles.error}>{error}</p>}

      {!showForm ? (
        <button type="button" className={adminStyles.btnPrimary} style={{ marginTop: '1rem' }} onClick={() => setShowForm(true)}>
          + Add opportunity
        </button>
      ) : (
        <div className={adminStyles.card} style={{ marginTop: '1rem' }}>
          <h3>New opportunity</h3>
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: '1rem' }}>
              <label className={styles.label}>Sector</label>
              <select
                className={styles.input}
                value={formSectorId}
                onChange={(e) => setFormSectorId(e.target.value)}
                required
              >
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className={styles.label}>Title *</label>
              <input
                className={styles.input}
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Seed grant 2025"
                required
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.input}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Details for entrepreneurs"
                rows={3}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className={styles.label}>Link (URL)</label>
              <input
                className={styles.input}
                type="url"
                value={formLink}
                onChange={(e) => setFormLink(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className={styles.label}>Eligibility criteria (optional)</label>
              <textarea
                className={styles.input}
                value={formEligibility}
                onChange={(e) => setFormEligibility(e.target.value)}
                placeholder="Students must confirm they meet these requirements before applying."
                rows={3}
              />
            </div>
            <label style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={formRequireMilestone}
                onChange={(e) => setFormRequireMilestone(e.target.checked)}
              />
              <span>Require at least one completed milestone (same sector)</span>
            </label>
            <button type="submit" className={adminStyles.btnPrimary} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create opportunity'}
            </button>
            <button type="button" className={adminStyles.btnDanger} style={{ marginLeft: '0.5rem' }} onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </form>
        </div>
      )}

      <div className={adminStyles.card} style={{ marginTop: '1.5rem' }}>
        <h3>Your opportunities</h3>
        {loading ? (
          <p className={adminStyles.loading}>Loading…</p>
        ) : opportunities.length === 0 ? (
          <p className={adminStyles.empty}>No opportunities yet. Create one above.</p>
        ) : (
          <div className={adminStyles.tableWrap}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Sector</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Applications</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((o) => (
                  <tr key={o.id}>
                    <td>{o.title}</td>
                    <td>{o.sectorName}</td>
                    <td>
                      <span className={o.status === 'VERIFIED' ? adminStyles.badgeVerified : adminStyles.badgePending}>
                        {o.status}
                      </span>
                    </td>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => setAppsOpp(o)}
                      >
                        Review submissions
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => openEdit(o)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {appsOpp && (
        <div
          className={modalStyles.overlay}
          onClick={() => setAppsOpp(null)}
          role="presentation"
        >
          <div
            className={modalStyles.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="apps-modal-title"
            style={{ maxWidth: '640px', maxHeight: '90vh', overflow: 'auto' }}
          >
            <div className={modalStyles.header}>
              <h3 id="apps-modal-title">Applications: {appsOpp.title}</h3>
              <button
                type="button"
                className={modalStyles.close}
                aria-label="Close"
                onClick={() => setAppsOpp(null)}
              >
                ×
              </button>
            </div>
            {appsError && <p className={adminStyles.error}>{appsError}</p>}
            {appsLoading ? (
              <p className={adminStyles.loading}>Loading…</p>
            ) : applications.length === 0 ? (
              <p className={adminStyles.empty}>No applications yet. When students apply, their submissions appear here.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {applications.map((app) => (
                  <li
                    key={app.id}
                    style={{
                      border: '1px solid var(--border, #ddd)',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <p style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
                      {app.studentFirstName} {app.studentLastName}
                      <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                        {app.studentEmail}
                      </span>
                    </p>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem' }}>
                      <strong>Venture:</strong> {app.primaryProjectTitle ?? '—'}{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>
                        · Submitted {new Date(app.createdAt).toLocaleString()}
                      </span>
                    </p>
                    <dl style={{ margin: '0.75rem 0 0', fontSize: '0.9rem' }}>
                      <dt style={{ fontWeight: 600, marginTop: '0.5rem' }}>Why it fits</dt>
                      <dd style={{ margin: '0.25rem 0 0', whiteSpace: 'pre-wrap' }}>{app.whyFit ?? '—'}</dd>
                      <dt style={{ fontWeight: 600, marginTop: '0.5rem' }}>Stage</dt>
                      <dd style={{ margin: '0.25rem 0 0' }}>{formatVentureStage(app.ventureStage)}</dd>
                      <dt style={{ fontWeight: 600, marginTop: '0.5rem' }}>Relevant experience</dt>
                      <dd style={{ margin: '0.25rem 0 0', whiteSpace: 'pre-wrap' }}>
                        {app.experienceSummary?.trim() ? app.experienceSummary : '—'}
                      </dd>
                      <dt style={{ fontWeight: 600, marginTop: '0.5rem' }}>Hopes to gain</dt>
                      <dd style={{ margin: '0.25rem 0 0', whiteSpace: 'pre-wrap' }}>
                        {app.outcomesSought?.trim() ? app.outcomesSought : '—'}
                      </dd>
                      <dt style={{ fontWeight: 600, marginTop: '0.5rem' }}>Support needed</dt>
                      <dd style={{ margin: '0.25rem 0 0', whiteSpace: 'pre-wrap' }}>
                        {app.supportNeeded?.trim() ? app.supportNeeded : '—'}
                      </dd>
                      <dt style={{ fontWeight: 600, marginTop: '0.5rem' }}>Evidence / traction</dt>
                      <dd style={{ margin: '0.25rem 0 0', whiteSpace: 'pre-wrap' }}>
                        {app.proofSummary?.trim() ? app.proofSummary : '—'}
                      </dd>
                      <dt style={{ fontWeight: 600, marginTop: '0.5rem' }}>Proof links</dt>
                      <dd style={{ margin: '0.25rem 0 0' }}>
                        {proofLinkLines(app.proofLinks).length === 0 ? (
                          '—'
                        ) : (
                          <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
                            {proofLinkLines(app.proofLinks).map((url) => {
                              const href = safeProofHref(url);
                              return (
                                <li key={url} style={{ wordBreak: 'break-all' }}>
                                  {href ? (
                                    <a href={href} target="_blank" rel="noopener noreferrer">
                                      {url}
                                    </a>
                                  ) : (
                                    url
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </dd>
                      {app.message?.trim() && (
                        <>
                          <dt style={{ fontWeight: 600, marginTop: '0.5rem' }}>Additional notes</dt>
                          <dd style={{ margin: '0.25rem 0 0', whiteSpace: 'pre-wrap' }}>{app.message}</dd>
                        </>
                      )}
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {editingOpportunity && (
        <div
          className={modalStyles.overlay}
          onClick={() => !submitting && setEditingOpportunity(null)}
          role="presentation"
        >
          <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-opportunity-title">
            <div className={modalStyles.header}>
              <h3 id="edit-opportunity-title">Edit opportunity</h3>
              <button
                type="button"
                onClick={() => !submitting && setEditingOpportunity(null)}
                className={modalStyles.close}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdate} className={adminStyles.card} style={{ marginTop: 0 }}>
              <div style={{ marginBottom: '1rem' }}>
                <label className={styles.label}>Sector</label>
                <select
                  className={styles.input}
                  value={formSectorId}
                  onChange={(e) => setFormSectorId(e.target.value)}
                  required
                >
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className={styles.label}>Title *</label>
                <input
                  className={styles.input}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Seed grant 2025"
                  required
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className={styles.label}>Description</label>
                <textarea
                  className={styles.input}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Details for entrepreneurs"
                  rows={3}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className={styles.label}>Link (URL)</label>
                <input
                  className={styles.input}
                  type="url"
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className={styles.label}>Eligibility criteria (optional)</label>
                <textarea
                  className={styles.input}
                  value={formEligibility}
                  onChange={(e) => setFormEligibility(e.target.value)}
                  rows={3}
                />
              </div>
              <label style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={formRequireMilestone}
                  onChange={(e) => setFormRequireMilestone(e.target.checked)}
                />
                <span>Require at least one completed milestone (same sector)</span>
              </label>
              <button type="submit" className={adminStyles.btnPrimary} disabled={submitting}>
                {submitting ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                className={adminStyles.btnDanger}
                style={{ marginLeft: '0.5rem' }}
                onClick={() => !submitting && setEditingOpportunity(null)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
