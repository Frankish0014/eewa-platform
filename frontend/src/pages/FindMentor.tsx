import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getMentorsBySector,
  getSectors,
  getProjects,
  requestMentorForProject,
  type MentorListItem,
  type Sector,
  type Project,
} from '../api/client';
import styles from './Dashboard.module.css';
import adminStyles from './Admin.module.css';
import modalStyles from './Projects.module.css';

export default function FindMentorPage() {
  const [mentors, setMentors] = useState<MentorListItem[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sectorId, setSectorId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState<MentorListItem | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    getSectors().then((r) => setSectors(r.sectors)).catch(() => {});
    getProjects().then((r) => setProjects(r.projects)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sectorId) {
      setMentors([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getMentorsBySector(sectorId)
      .then((r) => setMentors(r.mentors))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load mentors'))
      .finally(() => setLoading(false));
  }, [sectorId]);

  const openRequestModal = (mentor: MentorListItem) => {
    setShowRequestModal(mentor);
    setSelectedProjectId(projects.length > 0 ? projects[0].id : '');
    setRequestSuccess(null);
  };

  const handleRequestMentor = async () => {
    if (!showRequestModal || !selectedProjectId) return;
    setRequesting(true);
    setError(null);
    try {
      await requestMentorForProject(selectedProjectId, showRequestModal.id);
      setRequestSuccess('Mentor request sent. They will respond via their dashboard.');
      setTimeout(() => {
        setShowRequestModal(null);
      }, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send request');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div>
      <h1 className={styles.pageTitle}>Find a mentor</h1>
      <p className={styles.pageSubtitle}>
        Browse mentors by your venture’s sector. Request a mentor for one of your ventures; they can accept or decline from their dashboard.
      </p>
      <Link to="/">← Dashboard</Link>

      {error && <p className={adminStyles.error}>{error}</p>}
      {requestSuccess && <p className={adminStyles.card} style={{ background: 'var(--accent-muted)', color: 'var(--accent)', marginTop: '1rem' }}>{requestSuccess}</p>}

      <div className={styles.section} style={{ marginTop: '1.5rem' }}>
        <label className={styles.label} htmlFor="mentor-sector">Choose sector *</label>
        <select
          id="mentor-sector"
          className={styles.input}
          value={sectorId}
          onChange={(e) => setSectorId(e.target.value)}
          style={{ maxWidth: '280px', marginTop: '0.5rem' }}
        >
          <option value="">Select a sector…</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <p className={styles.welcome} style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
          Mentors are listed by the sectors they support. Pick the sector that matches your venture.
        </p>
      </div>

      <div className={adminStyles.card} style={{ marginTop: '1rem' }}>
        {!sectorId ? (
          <p className={adminStyles.empty}>Select a sector above to see mentors.</p>
        ) : loading ? (
          <p className={adminStyles.loading}>Loading…</p>
        ) : mentors.length === 0 ? (
          <p className={adminStyles.empty}>No mentors available in this sector yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mentors.map((m) => (
              <div
                key={m.id}
                className={adminStyles.card}
                style={{ marginBottom: 0, padding: '1rem', border: '1px solid var(--border)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>
                      {m.firstName} {m.lastName}
                    </h3>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      Sectors: {m.sectorNames.join(', ')}
                    </p>
                    {m.bio && (
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {m.bio}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.editBtn}
                    onClick={() => openRequestModal(m)}
                    disabled={projects.length === 0}
                    title={projects.length === 0 ? 'Create a venture first under My ventures' : 'Request this mentor for a venture'}
                  >
                    Request mentor
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {projects.length === 0 && (
        <p className={styles.welcome} style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          You need at least one venture to request a mentor. <Link to="/projects">Create a venture</Link> in My ventures, then come back to request a mentor for it.
        </p>
      )}

      {showRequestModal && (
        <div
          className={modalStyles.overlay}
          onClick={() => !requesting && setShowRequestModal(null)}
          role="presentation"
        >
          <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="request-mentor-title">
            <div className={modalStyles.header}>
              <h3 id="request-mentor-title">
                Request mentor: {showRequestModal.firstName} {showRequestModal.lastName}
              </h3>
              <button
                type="button"
                onClick={() => !requesting && setShowRequestModal(null)}
                className={modalStyles.close}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={adminStyles.card} style={{ marginTop: 0 }}>
              <p className={styles.label}>Select the venture you want mentorship for</p>
              <select
                className={styles.input}
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                style={{ marginTop: '0.5rem' }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className={adminStyles.btnPrimary}
                  onClick={handleRequestMentor}
                  disabled={requesting}
                >
                  {requesting ? 'Sending…' : 'Send request'}
                </button>
                <button
                  type="button"
                  className={adminStyles.btnDanger}
                  onClick={() => !requesting && setShowRequestModal(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
