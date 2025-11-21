import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import styles from './EmailVerification.module.css';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [hasVerified, setHasVerified] = useState(false); // Prevent multiple calls
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    // Only call verifyEmail once and if we have a token
    if (token && !hasVerified) {
      setHasVerified(true); // Mark as attempted
      verifyEmail();
    } else if (!token) {
      // Add a small delay before showing error to prevent flash
      setTimeout(() => {
        setError('Invalid verification link');
        setVerifying(false);
      }, 500);
    }
  }, [token, hasVerified]);

  const verifyEmail = async () => {
    // Keep verifying true at the start
    setVerifying(true);
    setError('');
    setSuccess(false);

    try {
      const response = await authService.verifyEmail(token);
      
      // Check if we got a successful response
      if (response.message && (response.message.includes('successfully') || response.message.includes('already verified'))) {
        // Store tokens if available
        if (response.accessToken) {
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          localStorage.setItem('user', JSON.stringify(response.user));
        }

        setSuccess(true);
        setVerifying(false);
        
        // If already verified, redirect to login instead of dashboard
        const alreadyVerified = response.alreadyVerified || response.message.includes('already verified');
        setIsAlreadyVerified(alreadyVerified);
        
        setTimeout(() => {
          navigate(alreadyVerified ? "/login" : "/dashboard");
        }, 2000);
      } else {
        // Handle unexpected response
        throw new Error(response.message || 'Invalid response from server');
      }
    } catch (err) {
      // Check if it's an already verified error (usually 400 with specific message)
      const errorMessage = err.response?.data?.message || err.message || 'Verification failed';
      
      // If email is already verified, treat it as success - don't log as error
      if (errorMessage.toLowerCase().includes('already verified')) {
        setSuccess(true);
        setIsAlreadyVerified(true);
        setVerifying(false);
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        // Only log actual unexpected errors
        console.error('Email verification error:', err);
        setError(errorMessage);
        setSuccess(false);
        setVerifying(false);
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {verifying ? (
          <>
            <div className={styles.loader}></div>
            <h1 className={styles.title}>Verifying your email...</h1>
            <p className={styles.subtitle}>Please wait while we verify your email address.</p>
          </>
        ) : success ? (
          <>
            <div className={styles.successIcon}>✓</div>
            <h1 className={styles.title}>Email Verified!</h1>
            <p className={styles.subtitle}>
              {isAlreadyVerified 
                ? 'Your email was already verified. Redirecting to login...'
                : 'Your email has been successfully verified. Redirecting to dashboard...'}
            </p>
            <Link to={isAlreadyVerified ? "/login" : "/dashboard"} className={styles.button}>
              {isAlreadyVerified ? 'Go to Login' : 'Go to Dashboard'}
            </Link>
          </>
        ) : (
          <>
            <div className={styles.errorIcon}>✕</div>
            <h1 className={styles.title}>Verification Failed</h1>
            <p className={styles.subtitle}>{error}</p>
            <div className={styles.actions}>
              <Link to="/register" className={styles.button}>
                Register Again
              </Link>
              <Link to="/login" className={styles.linkButton}>
                Go to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailVerification;