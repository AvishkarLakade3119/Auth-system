import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('adminUser');
      
      if (token && storedUser) {
        try {
          const userData = await authService.verifyToken();
          if (userData && userData.role === 'admin') {
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            throw new Error('Not an admin user');
          }
        } catch (verifyError) {
          // If verify fails, try using stored user data
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser.role === 'admin') {
            setUser(parsedUser);
            setIsAuthenticated(true);
          } else {
            throw new Error('Invalid stored user');
          }
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('adminToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('adminUser');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authService.login(email, password);
      
      if (response.user.role !== 'admin') {
        throw new Error('Access denied. Admin privileges required.');
      }
      
      // Store the token from the response (handle both accessToken and token fields)
      const token = response.accessToken || response.token;
      if (!token) {
        throw new Error('No authentication token received');
      }
      
      localStorage.setItem('adminToken', token);
      localStorage.setItem('accessToken', token); // Store in both places for compatibility
      localStorage.setItem('adminUser', JSON.stringify(response.user)); // Store user data
      setUser(response.user);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      setError(error.message || 'Login failed');
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('adminUser');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    checkAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};