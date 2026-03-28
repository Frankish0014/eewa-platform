import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPasswordWithToken } from '../api/client';
import PasswordInput from '../components/PasswordInput';
import styles from './Login.module.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError('This link is missing a reset token. Use the link from your email or request a new reset.');
      return;
    }
    const form = e.currentTarget;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value;
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { message } = await resetPasswordWithToken(token, password);
      setDoneMessage(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!token && !doneMessage) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <h1 className={styles.title}>Invalid link</h1>
          <p className={styles.subtitle}>
            This page needs a valid reset link from your email. You can request a new one below.
          </p>
          <Link to="/forgot-password" className={styles.button} style={{ display: 'inline-block', textDecoration: 'none' }}>
            Request password reset
          </Link>
          <p className={styles.footer} style={{ border: 'none', marginTop: '1rem' }}>
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  if (doneMessage) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <h1 className={styles.title}>Password updated</h1>
          <p className={styles.subtitle} style={{ color: 'var(--text)' }}>
            {doneMessage}
          </p>
          <Link to="/login" className={styles.button} style={{ textAlign: 'center', textDecoration: 'none', marginTop: '0.5rem' }}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Choose a new password</h1>
        <p className={styles.subtitle}>
          Use at least 12 characters with uppercase, lowercase, and a number.
        </p>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.error}>{error}</p>}
          <label className={styles.label}>
            New password
            <PasswordInput name="password" required autoComplete="new-password" className={styles.input} />
          </label>
          <label className={styles.label}>
            Confirm password
            <PasswordInput name="confirm" required autoComplete="new-password" className={styles.input} />
          </label>
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Saving…' : 'Update password'}
          </button>
          <Link to="/login" className={styles.footer} style={{ marginTop: '0.5rem', display: 'block', border: 'none' }}>
            Back to sign in
          </Link>
        </form>
      </div>
    </div>
  );
}
