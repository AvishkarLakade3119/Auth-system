import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    // Check for both adminToken and accessToken for compatibility
    const token = localStorage.getItem('adminToken') || localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Request to:', config.url, 'with token:', token ? 'Present' : 'Missing');
    } else {
      console.warn('No auth token found for request:', config.url);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect to login if not already on login page and not a verify request
      const isLoginPage = window.location.pathname === '/login';
      const isVerifyRequest = error.config?.url?.includes('/verify');
      const isAdminRequest = error.config?.url?.includes('/admin');
      
      // Don't redirect if it's an admin request and we're already authenticated
      // Let the component handle the error
      if (!isLoginPage && !isVerifyRequest && !isAdminRequest) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password) => {
    try {
      // Backend expects 'username' field, not 'email'
      // For admin login, we don't need captcha token
      const response = await api.post('/auth/login', { 
        username: email, 
        password,
        captchaToken: 'admin-bypass' // Special token for admin login
      });
      
      // Handle both 'token' and 'accessToken' fields for compatibility
      if (response.data.accessToken && !response.data.token) {
        response.data.token = response.data.accessToken;
      }
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  verifyToken: async () => {
    try {
      const response = await api.get('/auth/verify');
      return response.data.user;
    } catch (error) {
      throw new Error('Token verification failed');
    }
  }
};

export default api;