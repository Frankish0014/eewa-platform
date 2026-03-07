import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PasswordInput from '../components/PasswordInput';
import styles from './Login.module.css';

export default function Login() {
  const { user, loading, error, login, clearError } = useAuth();

  useEffect(() => {
    clearError();
  }, [clearError]);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    try {
      await login(email, password);
    } catch {
      // error set in context
    }
  };

  if (loading && !error) {
    return (
      <div className={styles.wrapper}>
        <p className={styles.loading}>Signing in…</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>EEWA</h1>
        <p className={styles.subtitle}>Entrepreneur Empowerment Web Application</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.error}>{error}</p>}
          <label className={styles.label}>
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              className={styles.input}
            />
          </label>
          <label className={styles.label}>
            Password
            <PasswordInput name="password" required className={styles.input} />
          </label>
          <button type="submit" className={styles.button} disabled={loading}>
            Sign in
          </button>
        </form>
        <p className={styles.footer} style={{ marginTop: '1rem' }}>
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
