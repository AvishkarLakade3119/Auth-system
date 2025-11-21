import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './ActiveSessions.module.css';
import Notification from '../../components/Notification';
import adminService from '../../services/adminService';

const ActiveSessions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('lastActivity');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    // Check if user has admin privileges
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchActiveSessions();
  }, [user, navigate]);

  useEffect(() => {
    // Filter sessions based on search term
    const filtered = sessions.filter(session => 
      session.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.ipAddress.includes(searchTerm)
    );

    // Sort filtered sessions
    const sorted = [...filtered].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'username':
          aValue = a.username.toLowerCase();
          bValue = b.username.toLowerCase();
          break;
        case 'lastActivity':
          aValue = new Date(a.lastActivity);
          bValue = new Date(b.lastActivity);
          break;
        case 'loginTime':
          aValue = new Date(a.loginTime);
          bValue = new Date(b.loginTime);
          break;
        default:
          aValue = a[sortBy];
          bValue = b[sortBy];
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredSessions(sorted);
  }, [sessions, searchTerm, sortBy, sortOrder]);

  const fetchActiveSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await adminService.getSessions();
      setSessions(response.sessions || []);
    } catch (err) {
      setError(err.message);
      setNotification({
        type: 'error',
        message: 'Failed to load active sessions'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to terminate this session?')) {
      return;
    }

    try {
      await adminService.terminateSession(sessionId);
      setNotification({
        type: 'success',
        message: 'Session terminated successfully'
      });
      fetchActiveSessions(); // Refresh the list
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Failed to terminate session'
      });
    }
  };

  const handleTerminateAllSessions = async (userId) => {
    if (!window.confirm('Are you sure you want to terminate all sessions for this user?')) {
      return;
    }

    try {
      await adminService.terminateAllUserSessions(userId);
      setNotification({
        type: 'success',
        message: 'All user sessions terminated successfully'
      });
      fetchActiveSessions(); // Refresh the list
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Failed to terminate user sessions'
      });
    }
  };

  const formatDuration = (loginTime) => {
    const duration = Date.now() - new Date(loginTime).getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getActivityStatus = (lastActivity) => {
    const inactiveTime = Date.now() - new Date(lastActivity).getTime();
    const minutes = Math.floor(inactiveTime / (1000 * 60));
    
    if (minutes < 5) return { status: 'active', text: 'Active' };
    if (minutes < 15) return { status: 'idle', text: 'Idle' };
    return { status: 'inactive', text: 'Inactive' };
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading active sessions...</p>
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
        <h1>Active Sessions</h1>
        <button onClick={() => navigate('/admin')} className={styles.backButton}>
          ← Back to Dashboard
        </button>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search by username, email, or IP address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.sortControls}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={styles.sortSelect}
          >
            <option value="lastActivity">Last Activity</option>
            <option value="username">Username</option>
            <option value="loginTime">Login Time</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className={styles.sortOrderButton}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div className={styles.sessionsSummary}>
        <p>Total Active Sessions: <strong>{filteredSessions.length}</strong></p>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <p>⚠️ {error}</p>
        </div>
      )}

      {filteredSessions.length === 0 ? (
        <div className={styles.noSessions}>
          <p>No active sessions found</p>
        </div>
      ) : (
        <div className={styles.sessionsTable}>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>IP Address</th>
                <th>Device</th>
                <th>Location</th>
                <th>Login Time</th>
                <th>Duration</th>
                <th>Last Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session) => {
                const activityStatus = getActivityStatus(session.lastActivity);
                return (
                  <tr key={session.sessionId}>
                    <td>
                      <div className={styles.userInfo}>
                        <strong>{session.username}</strong>
                        <span className={styles.email}>{session.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.status} ${styles[activityStatus.status]}`}>
                        {activityStatus.text}
                      </span>
                    </td>
                    <td>{session.ipAddress}</td>
                    <td>{session.device || 'Unknown'}</td>
                    <td>{session.location || 'Unknown'}</td>
                    <td>{new Date(session.loginTime).toLocaleString()}</td>
                    <td>{formatDuration(session.loginTime)}</td>
                    <td>{new Date(session.lastActivity).toLocaleString()}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          onClick={() => handleTerminateSession(session.sessionId)}
                          className={styles.terminateButton}
                          title="Terminate this session"
                        >
                          ❌
                        </button>
                        <button
                          onClick={() => handleTerminateAllSessions(session.userId)}
                          className={styles.terminateAllButton}
                          title="Terminate all sessions for this user"
                        >
                          ⛔ All
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ActiveSessions;