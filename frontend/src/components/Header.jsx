import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Notification from './Notification';
import styles from './Header.module.css';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [logoutMessage, setLogoutMessage] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setLogoutMessage('Logging out...');
      
      await logout();
      
      setLogoutMessage('Logged out successfully!');
      setTimeout(() => {
        setLogoutMessage('');
        navigate('/login', { state: { logoutSuccess: true } });
      }, 2000);
    } catch (error) {
      console.error('Logout error:', error);
      setLogoutMessage('Logout failed. Please try again.');
      setTimeout(() => {
        setLogoutMessage('');
      }, 3000);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu when clicking on a link
  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <Notification 
        message={logoutMessage} 
        type={logoutMessage === 'Logging out...' ? 'info' : logoutMessage.includes('failed') ? 'error' : 'success'} 
        onClose={() => setLogoutMessage('')}
        duration={logoutMessage === 'Logging out...' ? 10000 : 3000}
      />
      <header className={styles.header}>
        <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          Auth System
        </Link>
        
        {/* Hamburger Menu Button */}
        <button 
          className={styles.mobileMenuBtn}
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          )}
        </button>
        
        <nav className={`${styles.nav} ${isMobileMenuOpen ? styles.active : ''}`}>
          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme} 
            className={styles.themeToggle}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            )}
          </button>
          
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className={styles.navLink} onClick={handleNavClick}>
                Dashboard
              </Link>
              <Link to="/profile" className={styles.navLink} onClick={handleNavClick}>
                Profile
              </Link>
              <Link to="/account-settings" className={styles.navLink} onClick={handleNavClick}>
                Settings
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className={styles.navLink} onClick={handleNavClick}>
                  Admin
                </Link>
              )}
              <div className={styles.userInfo}>
                <span className={styles.userName}>
                  {user?.name || user?.email}
                </span>
                <button 
                  onClick={handleLogout} 
                  className={styles.logoutBtn}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.navLink} onClick={handleNavClick}>
                Login
              </Link>
              <Link to="/register" className={styles.registerBtn} onClick={handleNavClick}>
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
    </>
  );
};

export default Header;