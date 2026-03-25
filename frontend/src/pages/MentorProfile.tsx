import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getMentorProfile,
  updateMentorProfile,
  getSectors,
  type Sector,
} from '../api/client';
import styles from './Dashboard.module.css';
import adminStyles from './Admin.module.css';

export default function MentorProfilePage() {
  const { user } = useAuth();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [maxMentees, setMaxMentees] = useState(5);
  const [isActive, setIsActive] = useState(true);
  const [selectedSectorIds, setSelectedSectorIds] = useState<string[]>([]);

  useEffect(() => {
    if (user?.role !== 'Mentor') {
      setLoading(false);
      return;
    }
    Promise.all([
      getSectors().then((r) => setSectors(r.sectors)),
      getMentorProfile()
        .then((r) => {
          setBio(r.profile.bio ?? '');
          setMaxMentees(r.profile.maxMentees);
          setIsActive(r.profile.isActive);
          setSelectedSectorIds(r.profile.sectorIds ?? []);
        })
        .catch(() => {
          setSelectedSectorIds([]);
        }),
    ]).finally(() => setLoading(false));
  }, [user?.role]);

  const toggleSector = (id: string) => {
    setSelectedSectorIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSectorIds.length === 0) {
      setError('Select at least one mentoring category so entrepreneurs can find you.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { profile: updated } = await updateMentorProfile({
        bio: bio.trim() || undefined,
        maxMentees,
        isActive,
        sectorIds: selectedSectorIds,
      });
      setBio(updated.bio ?? '');
      setMaxMentees(updated.maxMentees);
      setIsActive(updated.isActive);
      setSelectedSectorIds(updated.sectorIds ?? []);
      setSuccess('Mentor profile saved. You will appear in "Find a mentor" for the categories you selected.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'Mentor') {
    return (
      <div className={adminStyles.card}>
        <p className={adminStyles.error}>Access denied. Mentors only.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>Mentor profile</h1>
      <p className={styles.pageSubtitle}>
        Set your mentoring categories and bio so entrepreneurs can find you when they search by sector.
      </p>
      <Link to="/">← Dashboard</Link>

      {error && <p className={adminStyles.error}>{error}</p>}
      {success && (
        <p className={adminStyles.card} style={{ background: 'var(--accent-muted)', color: 'var(--accent)', marginTop: '1rem' }}>
          {success}
        </p>
      )}

      <div className={adminStyles.card} style={{ marginTop: '1.5rem', maxWidth: '560px' }}>
        {loading ? (
          <p className={adminStyles.loading}>Loading…</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 style={{ marginTop: 0 }}>Mentoring categories *</h3>
            <p className={styles.welcome} style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>
              Select the sectors you can mentor in. Entrepreneurs will see you in &quot;Find a mentor&quot; when they choose these categories.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {sectors.map((s) => (
                <label
                  key={s.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.75rem',
                    border: `1px solid ${selectedSectorIds.includes(s.id) ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    background: selectedSectorIds.includes(s.id) ? 'var(--accent-muted)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedSectorIds.includes(s.id)}
                    onChange={() => toggleSector(s.id)}
                  />
                  {s.name}
                </label>
              ))}
            </div>
            {sectors.length === 0 && <p className={adminStyles.empty}>No sectors loaded.</p>}

            <h3>Bio</h3>
            <textarea
              className={styles.input}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief description of your experience and how you can help entrepreneurs..."
              rows={4}
              maxLength={2000}
              style={{ marginTop: '0.5rem', width: '100%', resize: 'vertical' }}
            />

            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              <div>
                <label className={styles.label}>Max mentees</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxMentees}
                  onChange={(e) => setMaxMentees(Number(e.target.value) || 5)}
                  className={styles.input}
                  style={{ width: '80px', marginTop: '0.35rem' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                <input
                  type="checkbox"
                  id="mentor-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label htmlFor="mentor-active" className={styles.label} style={{ margin: 0 }}>
                  Active (visible to entrepreneurs)
                </label>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className={adminStyles.btnPrimary} disabled={saving}>
                {saving ? 'Saving…' : 'Save mentor profile'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
