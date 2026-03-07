import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PasswordInput from '../components/PasswordInput';
import styles from './Login.module.css';

export default function Register() {
  const { user, loading, error, register, clearError } = useAuth();

  useEffect(() => {
    clearError();
  }, [clearError]);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const firstName = (form.elements.namedItem('firstName') as HTMLInputElement).value;
    const lastName = (form.elements.namedItem('lastName') as HTMLInputElement).value;
    const role = (form.elements.namedItem('role') as HTMLInputElement)?.value;
    if (!role || !['Student', 'Mentor', 'OpportunityProvider'].includes(role)) {
      return;
    }
    try {
      await register({ email, password, firstName, lastName, role });
    } catch {
      // error set in context
    }
  };

  if (loading && !error) {
    return (
      <div className={styles.wrapper}>
        <p className={styles.loading}>Creating your account…</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.card} ${styles.cardWide}`}>
        <h1 className={styles.title}>EEWA</h1>
        <p className={styles.subtitle}>Create your account</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.error}>{error}</p>}
          <label className={styles.label}>
            First name
            <input type="text" name="firstName" autoComplete="given-name" required className={styles.input} />
          </label>
          <label className={styles.label}>
            Last name
            <input type="text" name="lastName" autoComplete="family-name" required className={styles.input} />
          </label>
          <div className={styles.roleSection}>
            <span className={styles.roleLabel}>I am a...</span>
            <div className={styles.roleOptions}>
              <label className={styles.roleCard}>
                <input type="radio" name="role" value="Student" required />
                <span className={styles.roleTitle}>Student entrepreneur</span>
                <span className={styles.roleDesc}>Building a venture, seeking mentorship & funding</span>
              </label>
              <label className={styles.roleCard}>
                <input type="radio" name="role" value="Mentor" />
                <span className={styles.roleTitle}>Mentor</span>
                <span className={styles.roleDesc}>Guiding entrepreneurs, sharing expertise</span>
              </label>
              <label className={styles.roleCard}>
                <input type="radio" name="role" value="OpportunityProvider" />
                <span className={styles.roleTitle}>Entrepreneur</span>
                <span className={styles.roleDesc}>Established business, opportunities to offer</span>
              </label>
            </div>
          </div>
          <label className={styles.label}>
            Email
            <input type="email" name="email" autoComplete="email" required className={styles.input} />
          </label>
          <label className={styles.label}>
            Password (min 8 chars, include uppercase, lowercase, number)
            <PasswordInput
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={styles.input}
            />
          </label>
          <button type="submit" className={styles.button} disabled={loading}>
            Sign up
          </button>
        </form>
        <p className={styles.footer} style={{ marginTop: '1rem' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
