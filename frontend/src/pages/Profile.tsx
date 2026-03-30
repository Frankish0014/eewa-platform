import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [otpEnabledDraft, setOtpEnabledDraft] = useState(false);
  const [otpPassword, setOtpPassword] = useState('');
  const [securitySubmitting, setSecuritySubmitting] = useState(false);

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

  useEffect(() => {
    if (profile) setOtpEnabledDraft(profile.emailSignInOtpEnabled);
  }, [profile]);

  const otpSettingDirty =
    profile != null && otpEnabledDraft !== profile.emailSignInOtpEnabled;

  /** Turning on requires current password; turning off does not. */
  const otpTurningOn =
    Boolean(profile) && otpSettingDirty && otpEnabledDraft && !profile!.emailSignInOtpEnabled;

  const handleSaveSignInSecurity = async () => {
    if (!profile || !otpSettingDirty) return;
    setSecuritySubmitting(true);
    setError(null);
    try {
      const { profile: updated } = await updateProfile({
        emailSignInOtpEnabled: otpEnabledDraft,
        ...(otpTurningOn ? { currentPassword: otpPassword } : {}),
      });
      setProfile(updated);
      setOtpPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update sign-in security');
    } finally {
      setSecuritySubmitting(false);
    }
  };

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

  /** Deployment flag only — each user’s own choice is `emailSignInOtpEnabled`. */
  const serverOtpExplicitlyOff = profile.emailSignInOtpServerEnabled === false;

  return (
    <div>
      <div className={profileStyles.header}>
        <h1 className={styles.pageTitle}>Profile</h1>
        <p className={profileStyles.subtitle}>
          Manage your account information —{' '}
          <Link to="/settings">theme &amp; delete account in Settings</Link>
        </p>
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
        <h3 className={styles.pageTitle} style={{ fontSize: '1.1rem' }}>
          Sign-in security
        </h3>
        <p className={styles.pageSubtitle} style={{ marginTop: '0.5rem' }}>
          Your choice here applies only to <strong>your</strong> account. You can turn email codes off anytime without
          your password; turning them on requires your current password.
        </p>
        {serverOtpExplicitlyOff && (
          <p className={profileStyles.signInSecurityInfo} role="status">
            This deployment is not sending sign-in email codes yet. You can still set your preference below — when an
            administrator enables the feature, it will follow what you save for your account.
          </p>
        )}
        <label className={profileStyles.checkboxRow}>
          <input
            type="checkbox"
            checked={otpEnabledDraft}
            onChange={(e) => setOtpEnabledDraft(e.target.checked)}
            disabled={securitySubmitting}
          />
          <span>Require email code on new sign-ins (for my account)</span>
        </label>
        {otpSettingDirty && (
          <div className={profileStyles.securityFields}>
            {otpTurningOn ? (
              <label className={profileStyles.securityLabel}>
                Current password (required to turn this on)
                <input
                  type="password"
                  autoComplete="current-password"
                  value={otpPassword}
                  onChange={(e) => setOtpPassword(e.target.value)}
                  disabled={securitySubmitting}
                  className={profileStyles.securityInput}
                />
              </label>
            ) : (
              <p className={profileStyles.securityHint}>
                Turning off email codes does not require your password — you’re already signed in.
              </p>
            )}
            <div className={profileStyles.securityActions}>
              <button
                type="button"
                className={styles.editBtn}
                disabled={securitySubmitting || (otpTurningOn && !otpPassword.trim())}
                onClick={() => void handleSaveSignInSecurity()}
              >
                {securitySubmitting ? 'Saving…' : otpEnabledDraft ? 'Save — turn on email codes' : 'Save — turn off email codes'}
              </button>
              <button
                type="button"
                className={profileStyles.cancelBtn}
                disabled={securitySubmitting}
                onClick={() => {
                  setOtpEnabledDraft(profile.emailSignInOtpEnabled);
                  setOtpPassword('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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
