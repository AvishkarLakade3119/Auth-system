import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import profileService from '../services/profileService';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserActivities();
  }, []);

  const fetchUserActivities = async () => {
    try {
      const response = await profileService.getUserActivities();
      if (response.activities) {
        setActivities(response.activities);
      }

      console.log(user)

    } catch (err) {
      setError('Failed to load activities');
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityIcon = (action) => {
    switch (action) {
      case 'LOGIN':
      case 'LOGIN_SUCCESS':
        return '🔓';
      case 'LOGOUT':
        return '🔒';
      case 'REGISTER':
        return '👤';
      case 'PROFILE_UPDATE':
        return '✏️';
      case 'PASSWORD_CHANGE':
        return '🔑';
      default:
        return '📌';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Welcome back, {user?.name || user?.email}!</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Profile Overview</h2>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.profileInfo}>
              <div className={styles.avatar}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <p className={styles.name}>{user?.name || 'User'}</p>
                <p className={styles.email}>{user?.email}</p>
                <p className={styles.status}>
                  Status: <span className={styles.verified}>
                    {user?.isPublic ? '✓ Verified' : 'Unverified'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Account Stats</h2>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <p className={styles.statValue}>{activities.length}</p>
                <p className={styles.statLabel}>Total Activities</p>
              </div>
              <div className={styles.stat}>
                <p className={styles.statValue}>
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </p>
                <p className={styles.statLabel}>Member Since</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.activitySection}>
        <h2 className={styles.sectionTitle}>Recent Activities</h2>
        {loading ? (
          <div className={styles.loading}>Loading activities...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : activities.length === 0 ? (
          <div className={styles.empty}>No activities yet</div>
        ) : (
          <div className={styles.activityList}>
            {activities.slice(0, 10).map((activity) => (
              <div key={activity._id} className={styles.activityItem}>
                <div className={styles.activityIcon}>
                  {getActivityIcon(activity.action)}
                </div>
                <div className={styles.activityDetails}>
                  <p className={styles.activityAction}>{activity.action}</p>
                  <p className={styles.activityTime}>
                    {formatDate(activity.timestamp)}
                  </p>
                </div>
                <div className={styles.activityMeta}>
                  <span className={`${styles.activityStatus} ${activity.success ? styles.success : styles.failed}`}>
                    {activity.success ? 'Success' : 'Failed'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;