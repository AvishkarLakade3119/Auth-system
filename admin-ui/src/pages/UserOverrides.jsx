import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import LoadingSpinner from '../components/LoadingSpinner';
import styles from '../styles/UserOverrides.module.css';

const UserOverrides = () => {
  const [overrides, setOverrides] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOverride, setEditingOverride] = useState(null);
  const [formData, setFormData] = useState({
    userId: '',
    permissions: [],
    expiresAt: '',
    reason: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [overridesData, usersData] = await Promise.all([
        adminService.getUserOverrides(),
        adminService.getAllUsers()
      ]);
      setOverrides(overridesData.overrides || overridesData || []);
      setUsers(usersData.users || usersData || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Ensure admin_access includes all necessary permissions
      let permissions = [...formData.permissions];
      if (permissions.includes('admin_access')) {
        // Auto-include essential admin permissions
        const essentialPerms = ['user_management', 'session_management', 'override_management'];
        essentialPerms.forEach(perm => {
          if (!permissions.includes(perm)) {
            permissions.push(perm);
          }
        });
      }
      
      const dataToSubmit = {
        ...formData,
        permissions
      };
      
      if (editingOverride) {
        const response = await adminService.updateOverride(editingOverride._id, dataToSubmit);
        if (response.success) {
          alert('Override updated successfully! User now has admin access.');
        }
      } else {


        const response = await adminService.createOverride(dataToSubmit);
        if (response.success) {
          alert('Override created successfully! User can now login with their EMAIL as username.');
        }
      }
      
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving override:', error);
      alert('Failed to save override: ' + error.message);
    }
  };

  const handleDelete = async (overrideId) => {
    if (!window.confirm('Are you sure you want to delete this override?')) {
      return;
    }

    try {
      await adminService.deleteOverride(overrideId);
      setOverrides(overrides.filter(o => o._id !== overrideId));
      alert('Override deleted successfully');
    } catch (error) {
      console.error('Error deleting override:', error);
      alert('Failed to delete override: ' + error.message);
    }
  };

  const handleEdit = (override) => {
    setEditingOverride(override);
    setFormData({
      userId: override.userId._id || override.userId,
      permissions: override.permissions || [],
      expiresAt: override.expiresAt ? new Date(override.expiresAt).toISOString().split('T')[0] : '',
      reason: override.reason || ''
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      permissions: [],
      expiresAt: '',
      reason: ''
    });
    setEditingOverride(null);
    setShowAddForm(false);
  };

  const handlePermissionToggle = (permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  if (loading) {
    return <LoadingSpinner message="Loading user overrides..." />;
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error Loading Overrides</h2>
        <p>{error}</p>
        <button onClick={fetchData} className={styles.retryBtn}>
          Retry
        </button>
      </div>
    );
  }

  const availablePermissions = [
    'admin_access',
    'user_management',
    'session_management',
    'override_management',
    'report_access',
    'system_settings'
  ];

  return (
    <div className={styles.overridesContainer}>
      <div className={styles.header}>
        <h1>User Overrides</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={styles.addBtn}
        >
          {showAddForm ? '✖ Cancel' : '➕ Add Override'}
        </button>
      </div>

      {showAddForm && (
        <div className={styles.formContainer}>
          <h2>{editingOverride ? 'Edit Override' : 'Add New Override'}</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="userId">Select User</label>
              <select
                id="userId"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                required
                className={styles.select}
              >
                <option value="">Choose a user...</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Permissions</label>
              <div className={styles.permissionsGrid}>
                {availablePermissions.map(permission => (
                  <label key={permission} className={styles.permissionLabel}>
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(permission)}
                      onChange={() => handlePermissionToggle(permission)}
                    />
                    <span>{permission.replace(/_/g, ' ').toUpperCase()}</span>
                  </label>
                ))}
              </div>
              {formData.permissions.includes('admin_access') && (
                <p className={styles.adminNote}>
                  ⚠️ Admin access granted! User must login with their EMAIL address (not username).
                </p>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="expiresAt">Expires At (Optional)</label>
              <input
                type="date"
                id="expiresAt"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="reason">Reason</label>
              <textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
                rows="3"
                className={styles.textarea}
                placeholder="Provide a reason for this override..."
              />
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.submitBtn}>
                {editingOverride ? 'Update Override' : 'Create Override'}
              </button>
              <button type="button" onClick={resetForm} className={styles.cancelBtn}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {overrides.length === 0 ? (
        <div className={styles.noOverrides}>
          <p>No user overrides configured.</p>
        </div>
      ) : (
        <div className={styles.overridesTable}>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Permissions</th>
                <th>Expires</th>
                <th>Reason</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((override) => (
                <tr key={override._id}>
                  <td>
                    <div className={styles.userInfo}>
                      <strong>{override.userId?.name || 'Unknown'}</strong>
                      <br />
                      <small>{override.userId?.email}</small>
                    </div>
                  </td>
                  <td>
                    <div className={styles.permissionsList}>
                      {(override.permissions || []).map(perm => (
                        <span key={perm} className={styles.permissionBadge}>
                          {perm.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {override.expiresAt
                      ? new Date(override.expiresAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className={styles.reasonCell}>{override.reason}</td>
                  <td>
                    {new Date(override.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        onClick={() => handleEdit(override)}
                        className={styles.editBtn}
                        title="Edit Override"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(override._id)}
                        className={styles.deleteBtn}
                        title="Delete Override"
                      >
                        🗑️
                      </button>
                    </div>
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

export default UserOverrides;