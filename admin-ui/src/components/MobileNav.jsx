import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import styles from '../styles/MobileNav.module.css';

const MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest(`.${styles.mobileNav}`)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [window.location.pathname]);

  const toggleMenu = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/sessions', icon: '👥', label: 'Active Sessions' },
    { path: '/overrides', icon: '🔧', label: 'User Overrides' }
  ];

  return (
    <div className={styles.mobileNav}>
      {/* Hamburger Button */}
      <button 
        className={`${styles.hamburger} ${isOpen ? styles.open : ''}`}
        onClick={toggleMenu}
        aria-label="Toggle navigation menu"
        aria-expanded={isOpen}
      >
        <span className={styles.hamburgerLine}></span>
        <span className={styles.hamburgerLine}></span>
        <span className={styles.hamburgerLine}></span>
      </button>

      {/* Mobile Menu Overlay */}
      <div className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`} />

      {/* Mobile Menu */}
      <nav className={`${styles.mobileMenu} ${isOpen ? styles.menuOpen : ''}`}>
        <div className={styles.menuHeader}>
          <h2 className={styles.menuTitle}>Menu</h2>
          <button 
            className={styles.closeBtn}
            onClick={toggleMenu}
            aria-label="Close menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <ul className={styles.menuList}>
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `${styles.menuLink} ${isActive ? styles.active : ''}`
                }
                onClick={() => setIsOpen(false)}
              >
                <span className={styles.icon}>{item.icon}</span>
                <span className={styles.label}>{item.label}</span>
                <svg className={styles.arrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className={styles.menuFooter}>
          <p className={styles.footerText}>Admin Dashboard v1.0</p>
        </div>
      </nav>
    </div>
  );
};

export default MobileNav;