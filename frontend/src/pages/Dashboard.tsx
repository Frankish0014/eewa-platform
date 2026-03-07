import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OpportunityProviderDashboard from './OpportunityProviderDashboard';
import styles from './Dashboard.module.css';

function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    Student: 'Student entrepreneur',
    Mentor: 'Mentor',
    Entrepreneur: 'Entrepreneur',
    OpportunityProvider: 'Opportunity provider',
    Admin: 'Administrator',
    InstitutionStaff: 'Institution staff',
  };
  return labels[role] ?? role;
}

export default function Dashboard() {
  const { user } = useAuth();

  if (user?.role === 'OpportunityProvider') {
    return <OpportunityProviderDashboard />;
  }

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
          {user?.role === 'Admin' && (
            <>
              <li><Link to="/admin/opportunities">Verify opportunities</Link></li>
              <li><Link to="/admin/ventures">Ventures overview</Link></li>
              <li><Link to="/admin/users">Users</Link></li>
              <li><Link to="/admin/audit">Audit log</Link></li>
            </>
          )}
          {(user?.role === 'Student' || user?.role === 'Mentor') && (
            <li><Link to="/opportunities">Opportunities</Link></li>
          )}
        </ul>
      </section>

      <p className={styles.footer}>
        EEWA — Empowering African entrepreneurs with mentorship and funding.
      </p>
    </div>
  );
}
