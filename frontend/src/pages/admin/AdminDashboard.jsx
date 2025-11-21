import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './AdminDashboard.module.css';
import Notification from '../../components/Notification';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSessions: 0,
    activeOverrides: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    // Check if user has admin privileges
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchDashboardStats();
  }, [user, navigate]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard statistics');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
      setNotification({
        type: 'error',
        message: 'Failed to load dashboard statistics'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setNotification({
      type: 'info',
      message: 'Refreshing dashboard data...'
    });
    fetchDashboardStats();
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      
      <div className={styles.header}>
        <h1>Admin Dashboard</h1>
        <button onClick={handleRefresh} className={styles.refreshButton}>
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <p>⚠️ {error}</p>
        </div>
      )}

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Total Users</h3>
          <p className={styles.statNumber}>{stats.totalUsers}</p>
        </div>
        
        <div className={styles.statCard}>
          <h3>Active Sessions</h3>
          <p className={styles.statNumber}>{stats.activeSessions}</p>
          <Link to="/admin/sessions" className={styles.viewLink}>
            View All Sessions →
          </Link>
        </div>
        
        <div className={styles.statCard}>
          <h3>Active Overrides</h3>
          <p className={styles.statNumber}>{stats.activeOverrides}</p>
          <Link to="/admin/overrides" className={styles.viewLink}>
            Manage Overrides →
          </Link>
        </div>
      </div>

      <div className={styles.navigationSection}>
        <h2>Quick Actions</h2>
        <div className={styles.actionButtons}>
          <Link to="/admin/sessions" className={styles.actionButton}>
            <span className={styles.icon}>👥</span>
            <span>Active Sessions</span>
          </Link>
          <Link to="/admin/overrides" className={styles.actionButton}>
            <span className={styles.icon}>🔧</span>
            <span>User Overrides</span>
          </Link>
        </div>
      </div>

      <div className={styles.recentActivity}>
        <h2>Recent Activity</h2>
        {stats.recentActivity && stats.recentActivity.length > 0 ? (
          <ul className={styles.activityList}>
            {stats.recentActivity.map((activity, index) => (
              <li key={index} className={styles.activityItem}>
                <span className={styles.activityTime}>
                  {new Date(activity.timestamp).toLocaleString()}
                </span>
                <span className={styles.activityDescription}>
                  {activity.description}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.noActivity}>No recent activity to display</p>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;