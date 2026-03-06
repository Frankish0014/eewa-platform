import { useEffect, useState } from 'react';
import { getProfile, updateProfile, type Profile } from '../api/client';
import styles from './Dashboard.module.css';
import profileStyles from './Profile.module.css';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    getProfile()
      .then(({ profile }) => {
        setProfile(profile);
        setFirstName(profile.firstName);
        setLastName(profile.lastName);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { profile } = await updateProfile({ firstName, lastName });
      setProfile(profile);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className={styles.pageTitle}>Profile</h1>
        <div className={profileStyles.skeleton}>Loading profile…</div>
      </div>
    );
  }
  if (!profile) return <p className={styles.error}>Profile not found</p>;

  return (
    <div>
      <div className={profileStyles.header}>
        <h1 className={styles.pageTitle}>Profile</h1>
        <p className={profileStyles.subtitle}>Manage your account information</p>
      </div>

      {error && <div className={profileStyles.errorBanner}>{error}</div>}

      <form onSubmit={handleSave} className={profileStyles.form}>
        <div className={profileStyles.fieldGroup}>
          <label className={styles.label}>Email</label>
          <input
            type="email"
            value={profile.email}
            readOnly
            className={styles.input}
            style={{ opacity: 0.9 }}
          />
          <span className={profileStyles.roleBadge}>{profile.role}</span>
        </div>

        <div className={profileStyles.fieldGroup}>
          <label className={styles.label}>First name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            readOnly={!editing}
            className={styles.input}
            disabled={!editing}
          />
        </div>

        <div className={profileStyles.fieldGroup}>
          <label className={styles.label}>Last name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            readOnly={!editing}
            className={styles.input}
            disabled={!editing}
          />
        </div>

        <div className={profileStyles.actions}>
          {editing ? (
            <>
              <button type="submit" className={styles.button} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setFirstName(profile.firstName);
                  setLastName(profile.lastName);
                }}
                className={profileStyles.cancelBtn}
              >
                Cancel
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className={styles.button}>
              Edit profile
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
