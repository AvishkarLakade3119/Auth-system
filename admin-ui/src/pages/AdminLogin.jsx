import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from '../styles/AdminLogin.module.css';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { user, login, error, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user && user.role === 'admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loadingBox}>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect if already authenticated
  if (isAuthenticated && user && user.role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <h1 className={styles.title}>Admin Login</h1>
        <p className={styles.subtitle}>Access the admin dashboard</p>
        <div className={styles.info}>
          <p>ℹ️ <strong>Important:</strong> Admin users must use their <strong>email address</strong> to login.</p>
          <p>Regular users granted admin access should use their registered email, not username.</p>
        </div>
        
        {error && (
          <div className={styles.error}>
            {error}
            {error.includes('verify your email') && (
              <div className={styles.verificationHelp}>
                <p><small>If you're an admin user, please contact the system administrator to verify your account.</small></p>
                <p><small>System Admin: admin@yourdomain.com</small></p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Admin Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={styles.input}
              placeholder="admin@example.com"
              required
              autoComplete="email"
              title="Use your admin email as username"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={styles.input}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className={styles.footer}>
          <p>Admin access only. Unauthorized access is prohibited.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;