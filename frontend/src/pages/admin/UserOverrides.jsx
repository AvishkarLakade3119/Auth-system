import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './UserOverrides.module.css';
import Notification from '../../components/Notification';
import adminService from '../../services/adminService';

const UserOverrides = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    type: 'role',
    value: '',
    reason: '',
    expiresAt: ''
  });

  useEffect(() => {
    // Check if user has admin privileges
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    fetchUsersWithOverrides();
  }, [user, navigate]);

  useEffect(() => {
    // Filter users based on search term
    const filtered = users.filter(user => 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  const fetchUsersWithOverrides = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await adminService.getUsers(true); // Include system admin
      setUsers(response.users || []);
    } catch (err) {
      setError(err.message);
      setNotification({
        type: 'error',
        message: 'Failed to load users and overrides'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddOverride = (user) => {
    setSelectedUser(user);
    setOverrideForm({
      type: 'role',
      value: '',
      reason: '',
      expiresAt: ''
    });
    setShowOverrideModal(true);
  };

  const handleSubmitOverride = async (e) => {
    e.preventDefault();
    
    if (!overrideForm.value || !overrideForm.reason) {
      setNotification({
        type: 'error',
        message: 'Please fill in all required fields'
      });
      return;
    }

    try {
      // For now, we'll update the user's role as an override
      await adminService.updateUserStatus(selectedUser.id || selectedUser._id, { role: overrideForm.value });
      setNotification({
        type: 'success',
        message: 'User role updated successfully'
      });
      setShowOverrideModal(false);
      fetchUsersWithOverrides(); // Refresh the list
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Failed to update user role'
      });
    }
  };

  const handleRemoveOverride = async (userId, overrideId) => {
    if (!window.confirm('Are you sure you want to remove this override?')) {
      return;
    }

    try {
      await adminService.removeOverride(userId, overrideId);
      setNotification({
        type: 'success',
        message: 'Override removed successfully'
      });
      fetchUsersWithOverrides(); // Refresh the list
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Failed to remove override'
      });
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? false : true;
    const action = currentStatus === 'active' ? 'disable' : 'enable';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      await adminService.updateUserStatus(userId, { isActive: newStatus });
      setNotification({
        type: 'success',
        message: `User ${action}d successfully`
      });
      fetchUsersWithOverrides(); // Refresh the list
    } catch (err) {
      setNotification({
        type: 'error',
        message: `Failed to ${action} user`
      });
    }
  };

  const getOverrideTypeIcon = (type) => {
    switch (type) {
      case 'role': return '👥';
      case 'permission': return '🔑';
      case 'limit': return '📏';
      case 'feature': return '✨';
      default: return '🔧';
    }
  };

  const formatExpiryDate = (date) => {
    if (!date) return 'Never';
    const expiryDate = new Date(date);
    if (expiryDate < new Date()) return 'Expired';
    return expiryDate.toLocaleString();
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading user overrides...</p>
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
        <h1>User Overrides</h1>
        <button onClick={() => navigate('/admin')} className={styles.backButton}>
          ← Back to Dashboard
        </button>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search by username or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.overridesSummary}>
        <p>Total Users: <strong>{filteredUsers.length}</strong></p>
        <p>Active Overrides: <strong>{filteredUsers.reduce((sum, user) => sum + (user.overrides?.length || 0), 0)}</strong></p>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <p>⚠️ {error}</p>
        </div>
      )}

      {filteredUsers.length === 0 ? (
        <div className={styles.noUsers}>
          <p>No users found</p>
        </div>
      ) : (
        <div className={styles.usersGrid}>
          {filteredUsers.map((user) => {
            const userId = user._id || user.id;
            const userStatus = user.isActive !== false ? 'active' : 'inactive';
            return (
              <div key={userId} className={styles.userCard}>
              <div className={styles.userHeader}>
                <div className={styles.userInfo}>
                  <h3>{user.username || user.email}</h3>
                  <p>{user.email}</p>
                  <span className={`${styles.userStatus} ${styles[userStatus]}`}>
                    {userStatus}
                  </span>
                  {user.role && (
                    <span className={styles.userRole}>
                      Role: {user.role}
                    </span>
                  )}
                  {user.isSystemAdmin && (
                    <span className={styles.systemAdmin}>
                      🛡️ System Admin
                    </span>
                  )}
                </div>
                <div className={styles.userActions}>
                  {!user.isSystemAdmin && (
                    <>
                      <button
                        onClick={() => handleAddOverride(user)}
                        className={styles.addOverrideButton}
                        title="Change role"
                      >
                        ➕ Change Role
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(userId, userStatus)}
                        className={styles.toggleStatusButton}
                        title={userStatus === 'active' ? 'Disable user' : 'Enable user'}
                      >
                        {userStatus === 'active' ? '🚫' : '✅'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className={styles.userDetails}>
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>Created:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
                <p><strong>Last Login:</strong> {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</p>
              </div>

              {user.overrides && user.overrides.length > 0 && (
                <div className={styles.overridesList}>
                  <h4>Active Overrides</h4>
                  {user.overrides.map((override) => (
                    <div key={override.id} className={styles.overrideItem}>
                      <div className={styles.overrideInfo}>
                        <span className={styles.overrideType}>
                          {getOverrideTypeIcon(override.type)} {override.type}
                        </span>
                        <span className={styles.overrideValue}>{override.value}</span>
                      </div>
                      <div className={styles.overrideDetails}>
                        <p className={styles.overrideReason}>Reason: {override.reason}</p>
                        <p className={styles.overrideExpiry}>Expires: {formatExpiryDate(override.expiresAt)}</p>
                        <p className={styles.overrideCreated}>Created by: {override.createdBy}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveOverride(user.id, override.id)}
                        className={styles.removeOverrideButton}
                        title="Remove override"
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
          })}
        </div>
      )}

      {showOverrideModal && (
        <div className={styles.modalOverlay} onClick={() => setShowOverrideModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Add Override for {selectedUser?.username}</h2>
            <form onSubmit={handleSubmitOverride}>
              <div className={styles.formGroup}>
                <label>Override Type</label>
                <select
                  value={overrideForm.type}
                  onChange={(e) => setOverrideForm({ ...overrideForm, type: e.target.value })}
                  required
                >
                  <option value="role">Role</option>
                  <option value="permission">Permission</option>
                  <option value="limit">Limit</option>
                  <option value="feature">Feature</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Value</label>
                <input
                  type="text"
                  value={overrideForm.value}
                  onChange={(e) => setOverrideForm({ ...overrideForm, value: e.target.value })}
                  placeholder="e.g., admin, read-only, 1000, beta-access"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Reason</label>
                <textarea
                  value={overrideForm.reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                  placeholder="Explain why this override is necessary"
                  rows={3}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Expires At (Optional)</label>
                <input
                  type="datetime-local"
                  value={overrideForm.expiresAt}
                  onChange={(e) => setOverrideForm({ ...overrideForm, expiresAt: e.target.value })}
                />
              </div>

              <div className={styles.modalActions}>
                <button type="submit" className={styles.submitButton}>
                  Create Override
                </button>
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserOverrides;