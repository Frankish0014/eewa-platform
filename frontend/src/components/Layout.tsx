import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './Layout.module.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.logo}>EEWA</h1>
        <div className={styles.user}>
          {user ? (
            <>
              <span className={styles.role}>{user.role}</span>
              <span className={styles.email}>{user.email}</span>
            </>
          ) : (
            <span className={styles.email}>Loading…</span>
          )}
          <button type="button" onClick={handleLogout} className={styles.logout}>
            Log out
          </button>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
