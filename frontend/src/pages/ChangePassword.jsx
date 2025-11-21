import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import styles from './ChangePassword.module.css';

const ChangePassword = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validateForm = () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All fields are required');
      return false;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return false;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      if (response.success) {
        setSuccessMessage('Password changed successfully! Logging out...');
        
        // Logout and redirect to login after 2 seconds
        setTimeout(() => {
          logout();
          navigate('/login', { 
            state: { message: 'Password changed successfully. Please login with your new password.' } 
          });
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h1 className={styles.title}>Change Password</h1>
        <p className={styles.subtitle}>Update your password to keep your account secure</p>
        
        {successMessage && (
          <div className={styles.successMessage}>{successMessage}</div>
        )}
        
        {error && (
          <div className={styles.error}>{error}</div>
        )}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="currentPassword">Current Password</label>
            <div className={styles.passwordInput}>
              <input
                type={showPasswords.current ? 'text' : 'password'}
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Enter your current password"
                required
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => togglePasswordVisibility('current')}
              >
                {showPasswords.current ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="newPassword">New Password</label>
            <div className={styles.passwordInput}>
              <input
                type={showPasswords.new ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter your new password"
                required
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => togglePasswordVisibility('new')}
              >
                {showPasswords.new ? '🙈' : '👁️'}
              </button>
            </div>
            <small className={styles.hint}>Must be at least 6 characters long</small>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div className={styles.passwordInput}>
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your new password"
                required
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => togglePasswordVisibility('confirm')}
              >
                {showPasswords.confirm ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;