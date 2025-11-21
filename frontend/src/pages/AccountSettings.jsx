import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import styles from './AccountSettings.module.css';

const AccountSettings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('security');
  const [showDeregisterModal, setShowDeregisterModal] = useState(false);
  const [deregisterData, setDeregisterData] = useState({
    password: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleDeregisterChange = (e) => {
    const { name, value } = e.target;
    setDeregisterData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleDeregisterSubmit = async (e) => {
    e.preventDefault();
    
    if (!deregisterData.password) {
      setError('Please enter your password to confirm');
      return;
    }

    if (window.confirm('Are you absolutely sure you want to de-register your account? This action cannot be undone.')) {
      setLoading(true);
      setError('');

      try {
        const response = await authService.deregisterAccount(deregisterData);
        
        if (response.success) {
          setSuccessMessage(response.message || 'Account successfully de-registered');
          // Clear auth data and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to de-register account');
      } finally {
        setLoading(false);
      }
    }
  };

  const cancelDeregister = () => {
    setShowDeregisterModal(false);
    setDeregisterData({ password: '', reason: '' });
    setError('');
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Account Settings</h1>
      
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'security' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Security
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'danger' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('danger')}
        >
          Danger Zone
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'security' && (
          <div className={styles.section}>
            <h2>Security Settings</h2>
            <div className={styles.securityItem}>
              <h3>Change Password</h3>
              <p>Update your password regularly to keep your account secure.</p>
              <button 
                className={styles.primaryButton}
                onClick={() => navigate('/change-password')}
              >
                Change Password
              </button>
            </div>
          </div>
        )}

        {activeTab === 'danger' && (
          <div className={styles.section}>
            <h2 className={styles.dangerTitle}>Danger Zone</h2>
            
            <div className={styles.dangerItem}>
              <div className={styles.dangerInfo}>
                <h3>De-register Account</h3>
                <p>
                  De-register your account to permanently remove access. Your data will be anonymized for compliance purposes.
                  This action is irreversible and you will lose access to your account permanently.
                </p>
              </div>
              <button 
                className={styles.dangerButton}
                onClick={() => setShowDeregisterModal(true)}
              >
                De-register Account
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Deregister Modal */}
      {showDeregisterModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>De-register Account</h2>
            
            {successMessage ? (
              <div className={styles.successContainer}>
                <div className={styles.successMessage}>{successMessage}</div>
                <p>Redirecting to login page...</p>
              </div>
            ) : (
              <form onSubmit={handleDeregisterSubmit}>
                <p className={styles.warningText}>
                  ⚠️ <strong>Warning:</strong> This action is permanent and cannot be undone. Your account will be de-registered and data will be anonymized.
                </p>
                
                {error && <div className={styles.error}>{error}</div>}
                
                <div className={styles.formGroup}>
                  <label htmlFor="password">Confirm your password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={deregisterData.password}
                    onChange={handleDeregisterChange}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="reason">Reason for de-registering (optional)</label>
                  <textarea
                    id="reason"
                    name="reason"
                    value={deregisterData.reason}
                    onChange={handleDeregisterChange}
                    placeholder="Help us improve by sharing why you're de-registering"
                    rows="3"
                  />
                </div>
                
                <div className={styles.warningBox}>
                  <p><strong>What happens when you de-register:</strong></p>
                  <ul>
                    <li>Your personal data will be anonymized</li>
                    <li>You will lose access to your account immediately</li>
                    <li>Some records may be retained for compliance purposes</li>
                    <li>This action cannot be reversed</li>
                  </ul>
                </div>
                
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={cancelDeregister}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.confirmDangerButton}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'De-register Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;