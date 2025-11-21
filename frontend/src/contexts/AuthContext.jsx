import React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import profileService from '../services/profileService';

const AuthContext = createContext(null);

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

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (authService.isAuthenticated()) {
        const profileData = await profileService.getProfile();
        const profile = profileData.profile || profileData.data;
        // Ensure email is accessible at the top level
        if (profile && profile.user && profile.user.email) {
          profile.email = profile.user.email;
          profile.username = profile.user.username;
        }
        setUser(profile);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // If auth check fails, clear tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setError(null);
      const response = await authService.login(credentials);
      
      // Check if it's a direct login response (admin user)
      if (response.accessToken && response.user && response.user.isSystemAdmin) {
        // For system admin, set user data directly
        setUser({
          ...response.user,
          role: 'admin',
          isSystemAdmin: true
        });
      }
      
      return response;
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  const verifyOTP = async (data) => {
    try {
      setError(null);
      const response = await authService.verifyOTP(data);
      if (response.accessToken) {
        // Tokens are already stored by authService.verifyOTP
        
        // Check if it's a system admin user (file-based admin)
        if (response.user && response.user.isSystemAdmin) {
          // For system admin, use the user data from response directly
          setUser({
            ...response.user,
            role: 'admin',
            isSystemAdmin: true
          });
          return { ...response, success: true };
        }
        
        // For regular users, fetch user profile
        const profileData = await profileService.getProfile();
        const profile = profileData.profile || profileData.data;
        // Ensure email is accessible at the top level
        if (profile && profile.user && profile.user.email) {
          profile.email = profile.user.email;
          profile.username = profile.user.username;
        }
        setUser(profile);
        // Return success response
        return { ...response, success: true };
      }
      return response;
    } catch (error) {
      setError(error.response?.data?.message || 'OTP verification failed');
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const response = await authService.register(userData);
      return response;
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setError(null);
      const response = await profileService.updateProfile(profileData);
      if (response.profile) {
        // Fetch the updated profile to ensure we have the complete user data
        const profileData = await profileService.getProfile();
        setUser(profileData.profile);
        return { success: true, data: profileData.profile };
      }
      return response;
    } catch (error) {
      setError(error.response?.data?.message || 'Profile update failed');
      throw error;
    }
  };

  const deleteAccount = async () => {
    try {
      setError(null);
      const response = await authService.deleteAccount();
      if (response.success) {
        setUser(null);
        // Redirect will be handled by the component
      }
      return response;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete account');
      throw error;
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    verifyOTP,
    register,
    logout,
    updateProfile,
    deleteAccount,
    checkAuth,
    isAuthenticated: !!user || authService.isAuthenticated(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};