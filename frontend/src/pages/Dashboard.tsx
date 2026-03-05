import { useAuth } from '../contexts/AuthContext';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className={styles.dashboard}>
      <h2>Dashboard</h2>
      <p className={styles.welcome}>
        Welcome, <strong>{user?.email}</strong>. You are signed in as <strong>{user?.role}</strong>.
      </p>
      <section className={styles.section}>
        <h3>Quick links</h3>
        <ul className={styles.links}>
          {user?.role === 'Student' && (
            <>
              <li><a href="#projects">My projects</a></li>
              <li><a href="#milestones">Milestones</a></li>
              <li><a href="#mentors">Find a mentor</a></li>
            </>
          )}
          {user?.role === 'Mentor' && (
            <>
              <li><a href="#mentees">My mentees</a></li>
              <li><a href="#matches">Matching requests</a></li>
            </>
          )}
          {user?.role === 'Admin' && (
            <>
              <li><a href="#opportunities">Verify opportunities</a></li>
              <li><a href="#users">Users</a></li>
              <li><a href="#audit">Audit log</a></li>
            </>
          )}
          {(user?.role === 'Student' || user?.role === 'Mentor') && (
            <li><a href="#opportunities">Opportunities</a></li>
          )}
        </ul>
      </section>
      <p className={styles.footer}>
        EEWA — Empowering African student entrepreneurs.
      </p>
    </div>
  );
}
