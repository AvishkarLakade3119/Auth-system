import api from './api';

const adminService = {
  // Get all users
  getUsers: async (includeSystemAdmin = false) => {
    const response = await api.get('/admin/users', {
      params: { includeSystemAdmin: includeSystemAdmin ? 'true' : 'false' }
    });
    return response.data;
  },

  // Get user sessions/activities
  getSessions: async () => {
    const response = await api.get('/admin/sessions');
    return response.data;
  },

  // Update user status
  updateUserStatus: async (userId, data) => {
    const response = await api.patch(`/admin/users/${userId}/status`, data);
    return response.data;
  },

  // Delete user (soft delete)
  deleteUser: async (userId) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  // Get user activities for a specific user
  getUserActivities: async (userId) => {
    const response = await api.get(`/admin/users/${userId}/activities`);
    return response.data;
  },

  // Get system statistics
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  }
};

export default adminService;