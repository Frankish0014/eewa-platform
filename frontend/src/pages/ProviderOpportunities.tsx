import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getMyOpportunities,
  getSectors,
  createOpportunity,
  updateOpportunity,
  type Opportunity,
  type Sector,
} from '../api/client';
import styles from './Dashboard.module.css';
import adminStyles from './Admin.module.css';
import modalStyles from './Projects.module.css';

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
      });
      const res = await getMyOpportunities();
      setOpportunities(res.opportunities);
      setShowForm(false);
      setFormTitle('');
      setFormDescription('');
      setFormLink('');
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
    setError(null);
  };

  if (user?.role !== 'OpportunityProvider') {
    return (
      <div className={adminStyles.card}>
        <p className={adminStyles.error}>Access denied. Opportunity providers only.</p>
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
