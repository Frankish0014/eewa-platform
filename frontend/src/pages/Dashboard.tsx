import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './Dashboard.module.css';

function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    Student: 'Student entrepreneur',
    Mentor: 'Mentor',
    Entrepreneur: 'Entrepreneur',
    OpportunityProvider: 'Entrepreneur',
    Admin: 'Administrator',
    InstitutionStaff: 'Institution staff',
  };
  return labels[role] ?? role;
}

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className={styles.pageTitle}>Dashboard</h1>
      <p className={styles.pageSubtitle}>Overview and quick actions</p>

      <div className={styles.hero}>
        <h2>Welcome back</h2>
        <p className={styles.welcome}>
          <strong>{user?.email}</strong> — signed in as {getRoleLabel(user?.role ?? '')}
        </p>
      </div>

      <section className={styles.section}>
        <h3>Quick actions</h3>
        <ul className={styles.links}>
          {user?.role === 'Student' && (
            <>
              <li><Link to="/projects">My ventures</Link></li>
              <li><Link to="/profile">My profile</Link></li>
              <li><a href="#mentors">Find a mentor</a></li>
            </>
          )}
          {user?.role === 'Mentor' && (
            <>
              <li><Link to="/profile">My profile</Link></li>
              <li><a href="#mentees">My mentees</a></li>
              <li><a href="#matches">Matching requests</a></li>
            </>
          )}
          {user?.role === 'OpportunityProvider' && (
            <>
              <li><Link to="/profile">My profile</Link></li>
              <li><Link to="/projects">My ventures</Link></li>
              <li><a href="#opportunities">Opportunities</a></li>
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
        EEWA — Empowering African entrepreneurs with mentorship and funding.
      </p>
    </div>
  );
}
