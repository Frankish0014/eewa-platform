import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteAccount } from '../api/client';
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
          Choose a light or dark theme. Your choice is saved in this browser only.
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
          Profile &amp; security
        </h2>
        <p className={styles.sectionDesc}>Update your name, skills, and email sign-in verification (OTP on new devices).</p>
        <Link to="/profile" className={styles.linkBtn}>
          Open Profile →
        </Link>
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
