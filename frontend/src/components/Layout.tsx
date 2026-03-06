import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
            <Link to="/projects" className={location.pathname === '/projects' ? styles.active : ''}>
              Ventures
            </Link>
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
        <Outlet />
      </main>
    </div>
  );
}
