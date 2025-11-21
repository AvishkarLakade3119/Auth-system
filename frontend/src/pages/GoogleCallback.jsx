import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './GoogleCallback.module.css';

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  
  const accessToken = searchParams.get('accessToken');
  const refreshToken = searchParams.get('refreshToken');
  const error = searchParams.get('error');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    if (error) {
      // Handle error
      navigate('/login?error=google_auth_failed');
      return;
    }

    if (accessToken && refreshToken) {
      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      // Update auth context
      await checkAuth();
      
      // Redirect to dashboard
      navigate('/dashboard');
    } else {
      // No tokens, redirect to login
      navigate('/login');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loader}></div>
      <p className={styles.text}>Completing sign in...</p>
    </div>
  );
};

export default GoogleCallback;