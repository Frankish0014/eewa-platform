import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PasswordInput from '../components/PasswordInput';
import styles from './Login.module.css';

export default function Login() {
  const { user, loading, error, login, completeEmailOtpLogin, clearError } = useAuth();
  const [step, setStep] = useState<'password' | 'emailOtp'>('password');
  const [emailOtpToken, setEmailOtpToken] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState('');

  useEffect(() => {
    clearError();
  }, [clearError]);

  if (user) return <Navigate to="/" replace />;

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    try {
      const result = await login(email, password);
      if ('requiresEmailOtp' in result && result.requiresEmailOtp) {
        setEmailOtpToken(result.emailOtpToken);
        setPendingEmail(email);
        setStep('emailOtp');
      }
    } catch {
      // error set in context
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!emailOtpToken) return;
    const code = (e.currentTarget.elements.namedItem('code') as HTMLInputElement).value.replace(/\s/g, '');
    try {
      await completeEmailOtpLogin(emailOtpToken, code);
    } catch {
      // error set in context
    }
  };

  if (loading && !error && step === 'password') {
    return (
      <div className={styles.wrapper}>
        <p className={styles.loading}>Signing in…</p>
      </div>
    );
  }

  if (step === 'emailOtp') {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.subtitle}>
            We sent a 6-digit sign-in code to <strong>{pendingEmail}</strong>. Enter it below. The code expires in a few
            minutes.
          </p>
          <form onSubmit={handleOtpSubmit} className={styles.form}>
            {error && <p className={styles.error}>{error}</p>}
            <label className={styles.label}>
              Email code
              <input
                type="text"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                className={styles.input}
                placeholder="000000"
              />
            </label>
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? 'Verifying…' : 'Continue'}
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={() => {
                setStep('password');
                setEmailOtpToken(null);
                clearError();
              }}
            >
              Back to password
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>EEWA</h1>
        <p className={styles.subtitle}>Entrepreneur Empowerment Web Application</p>
        <form onSubmit={handlePasswordSubmit} className={styles.form}>
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
          <p style={{ margin: '-0.5rem 0 0', fontSize: '0.875rem' }}>
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
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
