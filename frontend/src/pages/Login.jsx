import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';
import AccessibleReCAPTCHA from '../components/AccessibleReCAPTCHA';
import Notification from '../components/Notification';
import styles from './Login.module.css';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [otpData, setOtpData] = useState({
    otp: '',
    username: '',
  });
  const [showOTP, setShowOTP] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const recaptchaRef = useRef(null);

  const { login, verifyOTP } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  // Check if redirected from logout or password change
  useEffect(() => {
    if (location.state?.logoutSuccess) {
      setSuccessMessage('Logout successful!');
      // Clear the state to prevent showing the message on page refresh
      window.history.replaceState({}, document.title);
    } else if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the state to prevent showing the message on page refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleOTPChange = (e) => {
    setOtpData({
      ...otpData,
      otp: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!captchaToken) {
      setError('Please complete the captcha verification');
      setLoading(false);
      return;
    }

    try {
      const response = await login({
        ...formData,
        captchaToken
      });
      
      // Check if it's a direct login (admin user)
      if (response.accessToken && response.user) {
        // Direct login successful (admin user)
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        setSuccessMessage('Admin login successful! Redirecting...');
        
        // Navigate to admin dashboard for admin users
        const redirectPath = response.user.role === 'admin' ? '/admin' : from;
        setTimeout(() => {
          navigate(redirectPath, { replace: true, state: { loginSuccess: true } });
        }, 1500);
      } else if (response.requiresOTP) {
        setOtpData({ ...otpData, username: formData.username });
        setShowOTP(true);
        setAttemptsRemaining(null);
        setIsAccountLocked(false);
      }
    } catch (err) {
      const errorData = err.response?.data;
      setError(errorData?.message || 'Login failed');
      
      // Handle account lock status and attempts remaining
      if (errorData?.isLocked) {
        setIsAccountLocked(true);
        setAttemptsRemaining(0);
      } else if (errorData?.attemptsRemaining !== undefined) {
        setAttemptsRemaining(errorData.attemptsRemaining);
      }
      
      // Reset captcha on error
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        setCaptchaToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await verifyOTP({
        username: otpData.username,
        otp: otpData.otp,
      });

      if (response && response.accessToken) {
        // Show success message
        setSuccessMessage('Login successful! Redirecting...');
        // Add a small delay to show the success message before navigation
        setTimeout(() => {
          navigate(from, { replace: true, state: { loginSuccess: true } });
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
  };

  const handleGoogleLogin = () => {
    authService.googleLogin();
  };

  return (
    <div className={styles.container}>
      <Notification 
        message={successMessage} 
        type="success" 
        onClose={() => setSuccessMessage('')}
      />
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>
          {showOTP ? 'Enter the OTP sent to your email' : 'Sign in to your account'}
        </p>

        {error && (
          <div className={styles.error}>
            {error}
            {isAccountLocked && (
              <div className={styles.lockedInfo}>
                <p>Your account has been locked. Please check your email for unlock instructions.</p>
                <Link to="/unlock-account" className={styles.unlockLink}>
                  Go to Account Unlock
                </Link>
              </div>
            )}
            {attemptsRemaining !== null && attemptsRemaining > 0 && (
              <div className={styles.attemptsWarning}>
                <strong>Warning:</strong> {attemptsRemaining} login attempt{attemptsRemaining > 1 ? 's' : ''} remaining before account lock.
              </div>
            )}
          </div>
        )}

        {!showOTP ? (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="username" className={styles.label}>
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                className={styles.input}
                onChange={handleChange}

                required
                placeholder="Enter your username"
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
                required
                placeholder="Enter your password"
              />
            </div>

            <div className={styles.forgotPassword}>
              <Link to="/forgot-password" className={styles.link}>
                Forgot your password?
              </Link>
            </div>

            <div className={styles.formGroup}>
              <AccessibleReCAPTCHA
                ref={recaptchaRef}
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                onChange={handleCaptchaChange}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !captchaToken}
              className={styles.submitBtn}
            >
              {loading ? 'Logging in...' : 'Log in'}
            </button>

          </form>
        ) : (
          <form onSubmit={handleOTPSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="otp" className={styles.label}>
                OTP Code
              </label>
              <input
                type="text"
                id="otp"
                name="otp"
                value={otpData.otp}
                onChange={handleOTPChange}
                className={styles.input}
                required
                placeholder="Enter 6-digit OTP"
                maxLength="6"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.submitBtn}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              type="button"
              onClick={() => setShowOTP(false)}
              className={styles.backBtn}
            >
              Back to Login
            </button>
          </form>
        )}

        {!showOTP && (
          <>
            <div className={styles.divider}>
              <span>OR</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className={styles.googleBtn}
            >
              <svg className={styles.googleIcon} viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <div className={styles.footer}>
              <span>Don't have an account? </span>
              <Link to="/register" className={styles.link}>
                Sign up
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;