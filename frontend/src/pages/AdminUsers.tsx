import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAdminUsers, type AdminUser } from '../api/client';
import styles from './Admin.module.css';

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'Admin') {
      setLoading(false);
      return;
    }
    getAdminUsers()
      .then((res) => setUsers(res.users))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [user?.role]);

  if (user?.role !== 'Admin') {
    return (
      <div className={styles.card}>
        <p className={styles.error}>Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>Users</h1>
      <p className={styles.pageSubtitle}>
        All registered users on the platform.
      </p>
      <Link to="/">← Dashboard</Link>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.card}>
        {loading ? (
          <p className={styles.loading}>Loading…</p>
        ) : users.length === 0 ? (
          <p className={styles.empty}>No users.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.firstName} {u.lastName}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
