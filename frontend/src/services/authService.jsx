import api from './api';

const authService = {

  // Base URL setup (ensure VITE_API_URL is correctly set in .env)
  setBaseUrl: () => {
    api.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  },
  // Register new user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Login user
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // Verify OTP for login
  verifyOTP: async (data) => {
    const response = await api.post('/auth/verify-otp', data);
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    return response.data;
  },

  // Verify email
  verifyEmail: async (token) => {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },

  // Forgot password
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Reset password
  resetPassword: async (data) => {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },

  // Unlock account
  unlockAccount: async (data) => {
    const response = await api.post('/auth/unlock-account', data);
    return response;
  },

  // Change password
  changePassword: async (data) => {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  },

  // Logout
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
  },

  // Delete account
  deleteAccount: async () => {
    const response = await api.delete('/auth/delete-account');
    return response.data;
  },

  // Deregister account (soft delete)
  deregisterAccount: async (data) => {
    const response = await api.post('/auth/deregister', data);
    if (response.data.success) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    return response.data;
  },

  // Google OAuth login
  googleLogin: () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('accessToken');
  },
};

export default authService;