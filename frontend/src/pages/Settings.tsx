import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteAccount, getProfile, updateProfile, type Profile } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import dashStyles from './Dashboard.module.css';
import styles from './Settings.module.css';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProfileLoading(true);
    getProfile()
      .then(({ profile: p }) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTurnOffOtp = async () => {
    if (!profile?.emailSignInOtpEnabled) return;
    setOtpBusy(true);
    setOtpError(null);
    setOtpMessage(null);
    try {
      const { profile: updated } = await updateProfile({ emailSignInOtpEnabled: false });
      setProfile(updated);
      setOtpMessage('Email sign-in codes are now off. You only need your password on new devices.');
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : 'Could not update setting');
    } finally {
      setOtpBusy(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDeleteError(null);
    setDeleteBusy(true);
    try {
      // Read from the form DOM so browser password autofill works (controlled state often stays empty).
      const form = e.currentTarget;
      const pwdEl = form.elements.namedItem('delete-password') as HTMLInputElement | null;
      const confirmEl = form.elements.namedItem('delete-confirm') as HTMLInputElement | null;
      const password = pwdEl?.value ?? '';
      const confirmation = confirmEl?.value ?? '';
      await deleteAccount(password, confirmation);
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete account');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={dashStyles.pageTitle}>Settings</h1>
      <p className={styles.intro}>
        Personalize how EEWA looks and manage account options. Profile details and sign-in security stay on{' '}
        <Link to="/profile">Profile</Link>.
      </p>

      <section className={styles.section} aria-labelledby="appearance-heading">
        <h2 id="appearance-heading" className={styles.sectionTitle}>
          Appearance
        </h2>
        <p className={styles.sectionDesc}>
          Choose a light or dark theme. It is saved in this browser separately for each signed-in account.
        </p>
        <div className={styles.themeToggle}>
          <button
            type="button"
            className={`${styles.themeBtn} ${theme === 'light' ? styles.themeBtnActive : ''}`}
            onClick={() => setTheme('light')}
          >
            Light
          </button>
          <button
            type="button"
            className={`${styles.themeBtn} ${theme === 'dark' ? styles.themeBtnActive : ''}`}
            onClick={() => setTheme('dark')}
          >
            Dark
          </button>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="profile-heading">
        <h2 id="profile-heading" className={styles.sectionTitle}>
          Profile &amp; sign-in codes
        </h2>
        <p className={styles.sectionDesc}>
          Update your name and skills on <Link to="/profile">Profile</Link>. Optional email codes for new devices are a{' '}
          <strong>per-account</strong> setting you manage there.
        </p>
        <Link to="/profile" className={styles.linkBtn}>
          Open full Profile →
        </Link>

        {!profileLoading && profile && profile.emailSignInOtpEnabled && (
          <div className={styles.otpCard}>
            <p className={styles.otpStatus}>
              <strong>Email sign-in codes are on for your account.</strong>{' '}
              {profile.emailSignInOtpServerEnabled ? (
                <>New browsers will ask for a code from your email after your password.</>
              ) : (
                <>
                  This deployment is not sending codes yet; when it does, new sign-ins will follow this preference for
                  your login only.
                </>
              )}
            </p>
            <button
              type="button"
              className={styles.otpTurnOffBtn}
              disabled={otpBusy}
              onClick={() => void handleTurnOffOtp()}
            >
              {otpBusy ? 'Turning off…' : 'Turn off email sign-in codes'}
            </button>
            {otpMessage && <p className={styles.otpSuccess}>{otpMessage}</p>}
            {otpError && <p className={styles.otpErr}>{otpError}</p>}
          </div>
        )}

        {!profileLoading && profile && !profile.emailSignInOtpEnabled && (
          <p className={styles.otpOffNote}>
            Email sign-in codes are <strong>off</strong> for your account. Turn them on or off anytime on{' '}
            <Link to="/profile">Profile</Link> (your password is required to turn on).
            {profile.emailSignInOtpServerEnabled === false ? (
              <>
                {' '}
                This deployment is not sending codes yet; your saved choice still applies to your account when the
                feature is enabled.
              </>
            ) : null}
          </p>
        )}
      </section>

      <section className={`${styles.section} ${styles.dangerSection}`} aria-labelledby="danger-heading">
        <h2 id="danger-heading" className={`${styles.sectionTitle} ${styles.dangerTitle}`}>
          Delete account
        </h2>
        <p className={styles.sectionDesc}>
          Permanently remove your account, ventures, messages, and other data tied to this login. This cannot be undone.
          The only admin account cannot be deleted until another user is promoted to Admin.
        </p>
        <form onSubmit={handleDeleteAccount} autoComplete="on">
          <div className={styles.field}>
            <label htmlFor="delete-password">Confirm your password</label>
            <input
              id="delete-password"
              name="delete-password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="delete-confirm">Type DELETE to confirm (any casing)</label>
            <input
              id="delete-confirm"
              name="delete-confirm"
              type="text"
              autoComplete="off"
              placeholder="delete or DELETE"
              required
            />
          </div>
          <button type="submit" className={styles.deleteBtn} disabled={deleteBusy}>
            {deleteBusy ? 'Deleting…' : 'Delete my account'}
          </button>
          {deleteError && <p className={styles.error}>{deleteError}</p>}
        </form>
      </section>
    </div>
  );
}
