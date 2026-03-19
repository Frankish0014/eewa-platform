import { useEffect, useState } from 'react';
import { api } from '../api/client';
import styles from './Dashboard.module.css';

interface ReportSummary {
  totalUsers?: number;
  totalProjects: number;
  totalMentors?: number;
  totalMentorAssignments?: number;
  totalOpportunities: number;
  verifiedOpportunities?: number;
  projectsByStatus?: Array<{ status: string; count: number }>;
  projectsBySector?: Array<{ sectorName: string; count: number }>;
}

export default function ReportsSummary() {
  const [data, setData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ summary: ReportSummary }>('/api/reports/summary');
        if (!cancelled) {
          setData(res.summary);
        }
      } catch (e) {
        if (!cancelled) {
          const err = e as Error;
          setError(err.message || 'Failed to load report summary');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p>Loading report summary...</p>;
  }

  if (error) {
    return <p className={styles.error}>{error}</p>;
  }

  if (!data) {
    return <p>No report data available.</p>;
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>Reports overview</h1>
      <p className={styles.pageSubtitle}>
        High-level summary of users, ventures, mentors, and opportunities.
      </p>

      <section className={styles.section}>
        <h3>Key metrics</h3>
        <ul className={styles.links}>
          <li>Total users: {data.totalUsers ?? 0}</li>
          <li>Total ventures: {data.totalProjects}</li>
          <li>Total mentors: {data.totalMentors ?? 0}</li>
          <li>Mentorship assignments: {data.totalMentorAssignments ?? 0}</li>
          <li>Total opportunities: {data.totalOpportunities}</li>
          <li>Verified opportunities: {data.verifiedOpportunities ?? 0}</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h3>Ventures by status</h3>
        {(data.projectsByStatus?.length ?? 0) === 0 ? (
          <p>No ventures yet.</p>
        ) : (
          <ul className={styles.links}>
            {(data.projectsByStatus ?? []).map((item) => (
              <li key={item.status}>
                {item.status}: {item.count}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h3>Ventures by sector</h3>
        {(data.projectsBySector?.length ?? 0) === 0 ? (
          <p>No ventures yet.</p>
        ) : (
          <ul className={styles.links}>
            {(data.projectsBySector ?? []).map((item) => (
              <li key={item.sectorName}>
                {item.sectorName}: {item.count}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

