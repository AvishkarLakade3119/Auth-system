import api from './authService';

export const adminService = {
  // Active Sessions Management
  getActiveSessions: async () => {
    try {
      // Add timestamp to prevent caching
      const response = await api.get('/admin/sessions', {
        params: { _t: Date.now() }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch sessions');
    }
  },

  terminateSession: async (sessionId) => {
    try {
      console.log('Terminating session:', sessionId);
      const response = await api.delete(`/admin/sessions/${sessionId}`);
      console.log('Session termination response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error terminating session:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to terminate session';
      throw new Error(errorMessage);
    }
  },

  // User Overrides Management
  getUserOverrides: async () => {
    try {
      const response = await api.get('/admin/overrides');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user overrides');
    }
  },

  createOverride: async (overrideData) => {
    try {
      const response = await api.post('/admin/overrides', overrideData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create override');
    }
  },

  updateOverride: async (overrideId, overrideData) => {
    try {
      const response = await api.put(`/admin/overrides/${overrideId}`, overrideData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update override');
    }
  },

  deleteOverride: async (overrideId) => {
    try {
      const response = await api.delete(`/admin/overrides/${overrideId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete override');
    }
  },

  // Dashboard Statistics
  getDashboardStats: async () => {
    try {
      const response = await api.get('/admin/stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch dashboard stats');
    }
  },

  // User Management
  getAllUsers: async () => {
    try {
      const response = await api.get('/admin/users');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch users');
    }
  },

  updateUserStatus: async (userId, status) => {
    try {
      const response = await api.patch(`/admin/users/${userId}/status`, { status });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update user status');
    }
  }
};