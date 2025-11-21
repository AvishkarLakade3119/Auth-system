import api from './api';

const adminService = {
  // Dashboard statistics
  getDashboardStats: async () => {
    try {
      const response = await api.get('/admin/dashboard-stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  // Active Sessions Management
  getActiveSessions: async () => {
    try {
      const response = await api.get('/admin/sessions');
      return response.data;
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      throw error;
    }
  },

  terminateSession: async (sessionId) => {
    try {
      const response = await api.delete(`/admin/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error terminating session:', error);
      throw error;
    }
  },

  terminateAllUserSessions: async (userId) => {
    try {
      const response = await api.delete(`/admin/users/${userId}/sessions`);
      return response.data;
    } catch (error) {
      console.error('Error terminating user sessions:', error);
      throw error;
    }
  },

  // User Overrides Management
  getUsersWithOverrides: async () => {
    try {
      const response = await api.get('/admin/users/overrides');
      return response.data;
    } catch (error) {
      console.error('Error fetching users with overrides:', error);
      throw error;
    }
  },

  createOverride: async (userId, overrideData) => {
    try {
      const response = await api.post(`/admin/users/${userId}/overrides`, overrideData);
      return response.data;
    } catch (error) {
      console.error('Error creating override:', error);
      throw error;
    }
  },

  removeOverride: async (userId, overrideId) => {
    try {
      const response = await api.delete(`/admin/users/${userId}/overrides/${overrideId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing override:', error);
      throw error;
    }
  },

  toggleUserStatus: async (userId, newStatus) => {
    try {
      const response = await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
      return response.data;
    } catch (error) {
      console.error('Error toggling user status:', error);
      throw error;
    }
  },

  // User Management
  getUsers: async (params = {}) => {
    try {
      const response = await api.get('/admin/users', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  getUserDetails: async (userId) => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user details:', error);
      throw error;
    }
  },

  updateUserRole: async (userId, role) => {
    try {
      const response = await api.patch(`/admin/users/${userId}/role`, { role });
      return response.data;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  },

  // Activity Logs
  getActivityLogs: async (params = {}) => {
    try {
      const response = await api.get('/admin/activity-logs', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      throw error;
    }
  },

  // System Health
  getSystemHealth: async () => {
    try {
      const response = await api.get('/admin/system/health');
      return response.data;
    } catch (error) {
      console.error('Error fetching system health:', error);
      throw error;
    }
  }
};

export default adminService;