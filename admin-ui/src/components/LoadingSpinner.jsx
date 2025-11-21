import React from 'react';
import styles from '../styles/LoadingSpinner.module.css';

const LoadingSpinner = ({ fullScreen = false, message = 'Loading...' }) => {
  return (
    <div className={`${styles.spinnerContainer} ${fullScreen ? styles.fullScreen : ''}`}>
      <div className={styles.spinner}></div>
      <p className={styles.message}>{message}</p>
    </div>
  );
};

export default LoadingSpinner;