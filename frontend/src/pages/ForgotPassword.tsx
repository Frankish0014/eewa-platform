import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api/client';
import styles from './Login.module.css';

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setDoneMessage(null);
    const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value.trim();
    if (!email) return;
    setLoading(true);
    try {
      const { message } = await requestPasswordReset(email);
      setDoneMessage(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Forgot password</h1>
        <p className={styles.subtitle}>Enter your email and we will send you a link to reset your password.</p>
        {doneMessage ? (
          <div className={styles.form}>
            <p className={styles.subtitle} style={{ margin: 0, color: 'var(--text)' }}>
              {doneMessage}
            </p>
            <Link to="/login" className={styles.button} style={{ textAlign: 'center', textDecoration: 'none' }}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <p className={styles.error}>{error}</p>}
            <label className={styles.label}>
              Email
              <input type="email" name="email" autoComplete="email" required className={styles.input} />
            </label>
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <Link to="/login" className={styles.footer} style={{ marginTop: '0.5rem', display: 'block', border: 'none' }}>
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
