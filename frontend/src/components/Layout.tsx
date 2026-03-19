import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';
import styles from './Layout.module.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <Link to="/" className={styles.logo}>EEWA</Link>
        <nav className={styles.nav}>
          <div className={styles.links}>
            <Link to="/" className={location.pathname === '/' ? styles.active : ''}>
              Dashboard
            </Link>
            <Link to="/profile" className={location.pathname === '/profile' ? styles.active : ''}>
              Profile
            </Link>
            <Link to="/notifications" className={location.pathname === '/notifications' ? styles.active : ''}>
              Notifications
            </Link>
            {(user?.role === 'Admin' || user?.role === 'InstitutionStaff') && (
              <Link to="/reports" className={location.pathname === '/reports' ? styles.active : ''}>
                Reports
              </Link>
            )}
            {user?.role === 'Student' && (
              <Link to="/mentors" className={location.pathname === '/mentors' ? styles.active : ''}>
                Find a mentor
              </Link>
            )}
            {user?.role === 'Mentor' && (
              <>
                <Link to="/mentor/profile" className={location.pathname === '/mentor/profile' ? styles.active : ''}>
                  Mentor profile
                </Link>
                <Link to="/mentor/requests" className={location.pathname === '/mentor/requests' ? styles.active : ''}>
                  Mentorship requests
                </Link>
              </>
            )}
            {(user?.role === 'Student' || user?.role === 'Mentor') && (
              <>
                <Link to="/projects" className={location.pathname === '/projects' ? styles.active : ''}>
                  Ventures
                </Link>
                <Link to="/opportunities" className={location.pathname === '/opportunities' ? styles.active : ''}>
                  Opportunities
                </Link>
              </>
            )}
            {user?.role === 'OpportunityProvider' && (
              <>
                <Link to="/provider/opportunities" className={location.pathname === '/provider/opportunities' ? styles.active : ''}>
                  My opportunities
                </Link>
                <Link to="/provider/entrepreneurs" className={location.pathname === '/provider/entrepreneurs' ? styles.active : ''}>
                  Entrepreneurs
                </Link>
                <Link to="/opportunities" className={location.pathname === '/opportunities' ? styles.active : ''}>
                  Opportunities
                </Link>
              </>
            )}
            {user?.role === 'Admin' && (
              <>
                <Link to="/admin/opportunities" className={location.pathname === '/admin/opportunities' ? styles.active : ''}>
                  Verify opportunities
                </Link>
                <Link to="/admin/ventures" className={location.pathname === '/admin/ventures' ? styles.active : ''}>
                  Ventures overview
                </Link>
                <Link to="/admin/users" className={location.pathname === '/admin/users' ? styles.active : ''}>
                  Users
                </Link>
                <Link to="/admin/audit" className={location.pathname === '/admin/audit' ? styles.active : ''}>
                  Audit log
                </Link>
              </>
            )}
          </div>
        </nav>
        <div className={styles.userBlock}>
          {user && (
            <>
              <span className={styles.role}>{user.role}</span>
              <span className={styles.email}>{user.email}</span>
            </>
          )}
          <button type="button" onClick={handleLogout} className={styles.logout}>
            Log out
          </button>
        </div>
      </aside>
      <main className={styles.main}>
        <div className={styles.mainTop}>
          <div />
          {user && <NotificationBell />}
        </div>
        <div className={styles.mainContent}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
