import { useEffect, useState } from 'react';
import { getProfile, updateProfile, type Profile } from '../api/client';
import ProfileForm from '../components/ProfileForm';
import styles from './Dashboard.module.css';
import profileStyles from './Profile.module.css';
import modalStyles from './Projects.module.css';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const loadProfile = () => {
    setLoading(true);
    setError(null);
    getProfile()
      .then(({ profile: p }) => setProfile(p))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load profile'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleUpdate = async (data: { firstName: string; lastName: string; skills?: string }) => {
    setSubmitting(true);
    setError(null);
    try {
      const { profile: updated } = await updateProfile({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        ...(data.skills !== undefined && { skills: data.skills.trim() ? data.skills.trim() : null }),
      });
      setProfile(updated);
      setShowEditModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update profile');
    } finally {
      setSubmitting(false);
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

  if (!profile) {
    return (
      <div>
        <h1 className={styles.pageTitle}>Profile</h1>
        <p className={styles.error}>Profile not found.</p>
      </div>
    );
  }

  return (
    <div>
      <div className={profileStyles.header}>
        <h1 className={styles.pageTitle}>Profile</h1>
        <p className={profileStyles.subtitle}>Manage your account information</p>
      </div>

      {error && <div className={profileStyles.errorBanner}>{error}</div>}

      <div className={profileStyles.card}>
        <div className={profileStyles.cardHeader}>
          <div>
            <h2 className={profileStyles.name}>
              {profile.firstName} {profile.lastName}
            </h2>
            <p className={profileStyles.meta}>{profile.email}</p>
            <span className={profileStyles.roleBadge}>{profile.role}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className={styles.editBtn}
          >
            Edit
          </button>
        </div>
        <dl className={profileStyles.dl}>
          <dt>First name</dt>
          <dd>{profile.firstName}</dd>
          <dt>Last name</dt>
          <dd>{profile.lastName}</dd>
          <dt>Email</dt>
          <dd>{profile.email}</dd>
          <dt>Role</dt>
          <dd>{profile.role}</dd>
          <dt>Skills & interests</dt>
          <dd style={{ whiteSpace: 'pre-wrap' }}>{profile.skills?.trim() ? profile.skills : '—'}</dd>
          {profile.institutionName && (
            <>
              <dt>Institution</dt>
              <dd>
                {profile.institutionName}
                {profile.institutionCountry ? ` (${profile.institutionCountry})` : ''}
              </dd>
            </>
          )}
        </dl>
      </div>

      <div className={profileStyles.card} style={{ marginTop: '1.5rem' }}>
        <h3 className={styles.pageTitle} style={{ fontSize: '1.1rem' }}>Sign-in security</h3>
        <p className={styles.pageSubtitle} style={{ marginTop: '0.5rem' }}>
          When you sign in from a new browser or device, EEWA emails you a one-time code after your password.
          This device is remembered until you sign out (then the next sign-in may require a code again).
        </p>
      </div>

      {showEditModal && (
        <div
          className={modalStyles.overlay}
          onClick={() => !submitting && setShowEditModal(false)}
          role="presentation"
        >
          <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
            <div className={modalStyles.header}>
              <h3 id="profile-modal-title">Edit profile</h3>
              <button
                type="button"
                onClick={() => !submitting && setShowEditModal(false)}
                className={modalStyles.close}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <ProfileForm
              profile={profile}
              onSubmit={handleUpdate}
              onCancel={() => !submitting && setShowEditModal(false)}
              isSubmitting={submitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
