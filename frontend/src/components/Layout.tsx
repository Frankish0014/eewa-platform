import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';
import styles from './Layout.module.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    // Close sidebar drawer when route changes (prevents it staying open after navigation).
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const minutes = Number(import.meta.env.VITE_SESSION_INACTIVITY_MINUTES ?? 15);
    const ms = Math.max(1, minutes) * 60 * 1000;
    let id: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(id);
      id = setTimeout(() => {
        logout();
        navigate('/login', { replace: true });
      }, ms);
    };
    // Include wheel so scrolling counts as activity (e.g. long 2FA setup instructions).
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(id);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.layout}>
      {mobileNavOpen && (
        <div
          className={styles.sidebarOverlay}
          onClick={() => setMobileNavOpen(false)}
          role="presentation"
        />
      )}

      <aside className={`${styles.sidebar} ${mobileNavOpen ? styles.sidebarOpen : ''}`}>
        <Link
          to="/"
          className={styles.logo}
          onClick={() => setMobileNavOpen(false)}
        >
          EEWA
        </Link>
        <nav className={styles.nav}>
          <div className={styles.links}>
            <Link
              to="/"
              className={location.pathname === '/' ? styles.active : ''}
              onClick={() => setMobileNavOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              to="/profile"
              className={location.pathname === '/profile' ? styles.active : ''}
              onClick={() => setMobileNavOpen(false)}
            >
              Profile
            </Link>
            <Link
              to="/settings"
              className={location.pathname === '/settings' ? styles.active : ''}
              onClick={() => setMobileNavOpen(false)}
            >
              Settings
            </Link>
            <Link
              to="/notifications"
              className={location.pathname === '/notifications' ? styles.active : ''}
              onClick={() => setMobileNavOpen(false)}
            >
              Notifications
            </Link>
            {(user?.role === 'Student' || user?.role === 'Mentor') && (
              <Link
                to="/messages"
                className={location.pathname === '/messages' ? styles.active : ''}
                onClick={() => setMobileNavOpen(false)}
              >
                Messages
              </Link>
            )}
            {(user?.role === 'Admin' || user?.role === 'InstitutionStaff') && (
              <Link
                to="/reports"
                className={location.pathname === '/reports' ? styles.active : ''}
                onClick={() => setMobileNavOpen(false)}
              >
                Reports
              </Link>
            )}
            {user?.role === 'Student' && (
              <Link
                to="/mentors"
                className={location.pathname === '/mentors' ? styles.active : ''}
                onClick={() => setMobileNavOpen(false)}
              >
                Find a mentor
              </Link>
            )}
            {user?.role === 'Mentor' && (
              <>
                <Link
                  to="/mentor/profile"
                  className={location.pathname === '/mentor/profile' ? styles.active : ''}
                  onClick={() => setMobileNavOpen(false)}
                >
                  Mentor profile
                </Link>
                <Link
                  to="/mentor/requests"
                  className={location.pathname === '/mentor/requests' ? styles.active : ''}
                  onClick={() => setMobileNavOpen(false)}
                >
                  Mentorship requests
                </Link>
              </>
            )}
            {(user?.role === 'Student' || user?.role === 'Mentor') && (
              <>
                <Link
                  to="/projects"
                  className={location.pathname === '/projects' ? styles.active : ''}
                  onClick={() => setMobileNavOpen(false)}
                >
                  Ventures
                </Link>
                <Link
                  to="/opportunities"
                  className={location.pathname === '/opportunities' ? styles.active : ''}
                  onClick={() => setMobileNavOpen(false)}
                >
                  Opportunities
                </Link>
              </>
            )}
            {(user?.role === 'OpportunityProvider' || user?.role === 'InstitutionStaff') && (
              <>
                <Link
                  to="/provider/opportunities"
                  className={location.pathname === '/provider/opportunities' ? styles.active : ''}
                  onClick={() => setMobileNavOpen(false)}
                >
                  My opportunities
                </Link>
                <Link
                  to="/provider/entrepreneurs"
                  className={location.pathname === '/provider/entrepreneurs' ? styles.active : ''}
                  onClick={() => setMobileNavOpen(false)}
                >
                  Entrepreneurs
                </Link>
                <Link
                  to="/opportunities"
                  className={location.pathname === '/opportunities' ? styles.active : ''}
                  onClick={() => setMobileNavOpen(false)}
                >
                  Opportunities
                </Link>
              </>
            )}
            {user?.role === 'Admin' && (
              <>
                <Link
                  to="/admin/opportunities"
                  className={location.pathname === '/admin/opportunities' ? styles.active : ''}
                  onClick={() => setMobileNavOpen(false)}
                >
                  Verify opportunities
                </Link>
                <Link
                  to="/admin/ventures"
                  className={location.pathname === '/admin/ventures' ? styles.active : ''}
                  onClick={() => setMobileNavOpen(false)}
                >
                  Ventures overview
                </Link>
                <Link
                  to="/admin/users"
                  className={location.pathname === '/admin/users' ? styles.active : ''}
                  onClick={() => setMobileNavOpen(false)}
                >
                  Users
                </Link>
                <Link
                  to="/admin/audit"
                  className={location.pathname === '/admin/audit' ? styles.active : ''}
                  onClick={() => setMobileNavOpen(false)}
                >
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
          <button
            type="button"
            className={styles.mobileToggle}
            onClick={() => setMobileNavOpen((o) => !o)}
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileNavOpen}
          >
            ☰
          </button>
          {user && <NotificationBell />}
        </div>
        <div className={styles.mainContent}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
