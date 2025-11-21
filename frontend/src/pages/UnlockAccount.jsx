import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';
import Notification from '../components/Notification';
import styles from './UnlockAccount.module.css';

const UnlockAccount = () => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [token, setToken] = useState('');
  const [isValidToken, setIsValidToken] = useState(true);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    // Extract token from URL
    const searchParams = new URLSearchParams(location.search);
    const urlToken = searchParams.get('token');
    
    if (urlToken) {
      setToken(urlToken);
    } else {
      setIsValidToken(false);
      setError('Invalid unlock link. Please check your email for the correct link.');
    }
  }, [location]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const validateForm = () => {
    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const response = await authService.unlockAccount({
        token,
        newPassword: formData.newPassword,
      });

      if (response.data.accessToken) {
        // Auto-login after successful unlock
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        setSuccessMessage('Account unlocked successfully! Redirecting to dashboard...');
        
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 2000);
      } else {
        setSuccessMessage('Account unlocked successfully! Redirecting to login...');
        
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unlock account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Notification 
        message={successMessage} 
        type="success" 
        onClose={() => setSuccessMessage('')}
      />
      <div className={styles.formWrapper}>
        <div className={styles.iconWrapper}>
          <svg className={styles.lockIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <h1 className={styles.title}>Unlock Your Account</h1>
        <p className={styles.subtitle}>
          Your account has been locked due to multiple failed login attempts. 
          Please set a new password to unlock your account.
        </p>

        {error && <div className={styles.error}>{error}</div>}

        {isValidToken ? (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="newPassword" className={styles.label}>
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className={styles.input}
                required
                placeholder="Enter new password"
                minLength="6"
              />
              <span className={styles.hint}>Password must be at least 6 characters long</span>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={styles.input}
                required
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.submitBtn}
            >
              {loading ? 'Unlocking Account...' : 'Unlock Account'}
            </button>
          </form>
        ) : (
          <div className={styles.invalidToken}>
            <p>The unlock link is invalid or has expired.</p>
            <Link to="/login" className={styles.link}>
              Back to Login
            </Link>
          </div>
        )}

        <div className={styles.footer}>
          <span>Remember your password? </span>
          <Link to="/login" className={styles.link}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnlockAccount;