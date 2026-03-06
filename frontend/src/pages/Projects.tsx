import { useEffect, useState } from 'react';
import {
  getProjects,
  createProject,
  updateProject,
  getProject,
  getSectors,
  deleteProject,
  type Project,
  type Sector,
  type ProjectCreateInput,
  type ProjectUpdateInput,
} from '../api/client';
import VentureForm from '../components/VentureForm';
import styles from './Dashboard.module.css';
import modalStyles from './Projects.module.css';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVenture, setEditingVenture] = useState<Project | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([getProjects(), getSectors()])
      .then(([projectsRes, sectorsRes]) => {
        setProjects(projectsRes.projects);
        setSectors(sectorsRes.sectors);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (editingId) {
      getProject(editingId)
        .then(({ project }) => setEditingVenture(project))
        .catch(() => setEditingId(null));
    } else {
      setEditingVenture(null);
    }
  }, [editingId]);

  const handleCreate = async (data: ProjectCreateInput) => {
    setSubmitting(true);
    setError(null);
    try {
      await createProject(data);
      setShowCreateForm(false);
      loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data: ProjectCreateInput & { status?: string }) => {
    if (!editingId) return;
    setSubmitting(true);
    setError(null);
    try {
      const updateData: ProjectUpdateInput = { ...data };
      await updateProject(editingId, updateData);
      setEditingId(null);
      loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this venture?')) return;
    try {
      await deleteProject(id);
      if (editingId === id) setEditingId(null);
      loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className={styles.pageTitle}>Ventures</h1>
        <p className={styles.pageSubtitle}>Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className={styles.pageTitle}>Ventures</h1>
          <p className={styles.pageSubtitle}>Create and manage your ventures for funding</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowCreateForm(!showCreateForm); setError(null); }}
          className={styles.button}
        >
          {showCreateForm ? 'Cancel' : '+ Add venture'}
        </button>
      </div>

      {error && <p className={styles.error} style={{ marginBottom: '1rem' }}>{error}</p>}

      {showCreateForm && (
        <div className={styles.card} style={{ marginBottom: '1.5rem' }}>
          <VentureForm
            sectors={sectors}
            venture={null}
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
            isSubmitting={submitting}
            mode="create"
          />
        </div>
      )}

      {editingId && editingVenture && (
        <div className={modalStyles.overlay} onClick={() => !submitting && setEditingId(null)}>
          <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={modalStyles.header}>
              <h3>Edit venture</h3>
              <button type="button" onClick={() => setEditingId(null)} className={modalStyles.close} aria-label="Close">×</button>
            </div>
            <VentureForm
              sectors={sectors}
              venture={editingVenture}
              onSubmit={handleUpdate}
              onCancel={() => setEditingId(null)}
              isSubmitting={submitting}
              mode="edit"
            />
          </div>
        </div>
      )}

      {projects.length === 0 && !showCreateForm ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No ventures yet</p>
          <p className={styles.welcome}>
            Add your first venture to seek mentorship and funding.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className={styles.button}
            style={{ marginTop: '1rem' }}
          >
            + Add your first venture
          </button>
        </div>
      ) : (
        <div className={styles.projectGrid}>
          {projects.map((p) => (
            <div key={p.id} className={styles.ventureCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{p.title}</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginTop: '0.35rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{p.sectorName}</span>
                    {p.country && <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>• {p.country}</span>}
                    {p.stage && (
                      <span style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem', background: 'var(--border)', borderRadius: '4px' }}>
                        {p.stage}
                      </span>
                    )}
                    <span style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem', background: 'var(--surface)', borderRadius: '4px' }}>
                      {p.status}
                    </span>
                    {p.fundingAmountSought != null && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>
                        ${p.fundingAmountSought.toLocaleString()} sought
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingId(p.id)}
                  className={styles.editBtn}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className={styles.deleteBtn}
                >
                  Delete
                </button>
                </div>
              </div>
              {p.description && (
                <p style={{ margin: '0.5rem 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
                  {p.description}
                </p>
              )}
              {p.problemStatement && (
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
                  <strong>Problem:</strong> {p.problemStatement}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

