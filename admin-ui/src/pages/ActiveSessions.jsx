import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import styles from '../styles/ActiveSessions.module.css';

const ActiveSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      
      // Clear existing sessions before fetching new ones
      const data = await adminService.getActiveSessions();
      
      // Ensure we have fresh data and force state update
      const newSessions = data.sessions || [];
      setSessions([...newSessions]); // Create new array reference to force re-render
      
      console.log('Sessions refreshed:', newSessions.length, 'sessions found');
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError(error.message);
      setSessions([]); // Clear sessions on error
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to terminate this session?')) {
      return;
    }

    try {
      // Optimistically remove the session from UI
      setSessions(prevSessions => prevSessions.filter(session => session._id !== sessionId));
      
      // Terminate the session on backend
      await adminService.terminateSession(sessionId);
      
      // Show success message
      alert('Session terminated successfully');
      
      // Fetch fresh data from backend to ensure consistency
      // Use a slight delay to ensure backend has processed the termination
      setTimeout(async () => {
        await fetchSessions();
      }, 500);
      
    } catch (error) {
      console.error('Error terminating session:', error);
      alert('Failed to terminate session: ' + error.message);
      // Refresh sessions on error to restore correct state
      await fetchSessions();
    }
  };

  const filteredSessions = sessions.filter(session => {
    const matchesFilter = filter === 'all' || session.status === filter;
    const matchesSearch = 
      session.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||


      session.user?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading && sessions.length === 0) {
    return <LoadingSpinner message="Loading active sessions..." />;
  }

  if (error && sessions.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error Loading Sessions</h2>
        <p>{error}</p>
        <button onClick={fetchSessions} className={styles.retryBtn}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.sessionsContainer}>
      <div className={styles.header}>

        <div>
          <h1>Active Sessions</h1>
          <p className={styles.subtitle}>Monitor and manage user sessions</p>
        </div>
        <button onClick={fetchSessions} className={styles.refreshBtn}>
          🔄 Refresh
        </button>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>👥</div>
          <div className={styles.statContent}>
            <h3>Total Sessions</h3>
            <p className={styles.statValue}>{sessions.length}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🟢</div>
          <div className={styles.statContent}>
            <h3>Active</h3>
            <p className={styles.statValue}>{sessions.filter(s => s.status === 'active').length}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🟡</div>
          <div className={styles.statContent}>
            <h3>Idle</h3>
            <p className={styles.statValue}>{sessions.filter(s => s.status === 'idle').length}</p>
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"

            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.filterButtons}>
          <button
            className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >

            All
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'active' ? styles.active : ''}`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button
            className={`${styles.filterBtn} ${filter === 'idle' ? styles.active : ''}`}
            onClick={() => setFilter('idle')}
          >
            Idle
          </button>
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <div className={styles.noSessions}>
          <div className={styles.noSessionsIcon}>📭</div>
          <p>No sessions found matching your criteria.</p>
        </div>
      ) : (
        <div className={styles.sessionsTable}>
          <table>
            <thead>
              <tr>
                <th>User</th>

                <th>Login Time</th>
                <th>Last Activity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session) => (
                <tr key={`session-${session._id}-${session.loginTime}`}>
                  <td>
                    <div className={styles.userInfo}>



                      <div className={styles.userAvatar}>
                        {(session.user?.name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <strong>{session.user?.name || 'Unknown'}</strong>
                        <br />
                        <small>{session.user?.email}</small>
                      </div>
                    </div>
                  </td>

                  <td>



                    <div className={styles.timeInfo}>
                      {session.loginTime
                        ? formatDistanceToNow(new Date(session.loginTime), { addSuffix: true })
                        : 'N/A'}
                    </div>
                  </td>
                  <td>



                    <div className={styles.timeInfo}>
                      {session.lastActivity
                        ? formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true })
                        : 'N/A'}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`${styles.status} ${
                        session.status === 'active' ? styles.statusActive : styles.statusIdle
                      }`}
                    >
                      {session.status || 'active'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleTerminateSession(session._id)}
                      className={styles.terminateBtn}
                      title="Terminate Session"
                    >

                      Terminate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ActiveSessions;