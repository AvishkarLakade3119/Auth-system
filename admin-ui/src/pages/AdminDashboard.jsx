import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import LoadingSpinner from '../components/LoadingSpinner';
import styles from '../styles/AdminDashboard.module.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await adminService.getDashboardStats();
      console.log('Dashboard stats response:', response);
      
      // Handle the response structure
      if (response && response.success !== false) {
        setStats(response);
        setError(null);
      } else {
        throw new Error(response?.message || 'Failed to fetch dashboard stats');
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error Loading Dashboard</h2>
        <p>{error}</p>
        <button onClick={fetchDashboardStats} className={styles.retryBtn}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>Admin Dashboard</h1>
        <p className={styles.subtitle}>System Overview and Statistics</p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>👥</div>
          <div className={styles.statContent}>
            <h3>Total Users</h3>
            <p className={styles.statValue}>{stats?.totalUsers || 0}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>🔴</div>
          <div className={styles.statContent}>
            <h3>Active Sessions</h3>
            <p className={styles.statValue}>{stats?.activeSessions || 0}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>🔧</div>
          <div className={styles.statContent}>
            <h3>User Overrides</h3>
            <p className={styles.statValue}>{stats?.totalOverrides || 0}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>🕒</div>
          <div className={styles.statContent}>
            <h3>Avg Session Duration</h3>
            <p className={styles.statValue}>{stats?.avgSessionDuration || '0m'}</p>
          </div>
        </div>
      </div>

      <div className={styles.quickActions}>
        <h2>Quick Actions</h2>
        <div className={styles.actionButtons}>
          <button
            onClick={() => navigate('/sessions')}
            className={styles.actionBtn}
          >
            <span className={styles.actionIcon}>👁️</span>
            View Active Sessions
          </button>
          <button
            onClick={() => navigate('/overrides')}
            className={styles.actionBtn}
          >
            <span className={styles.actionIcon}>⚙️</span>
            Manage User Overrides
          </button>
        </div>
      </div>

      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <div className={styles.recentActivity}>
          <h2>Recent Activity</h2>
          <div className={styles.activityList}>
            {stats.recentActivity.map((activity, index) => (
              <div key={index} className={styles.activityItem}>
                <span className={styles.activityTime}>
                  {new Date(activity.timestamp).toLocaleString()}
                </span>
                <span className={styles.activityDescription}>
                  {activity.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;