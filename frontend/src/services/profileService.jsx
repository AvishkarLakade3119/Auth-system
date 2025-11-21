import api from './api';

const profileService = {

  // Base URL setup (ensure VITE_API_URL is correctly set in .env)
  setBaseUrl: () => {
    api.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  },
  // Get user profile
  getProfile: async () => {
    const response = await api.get('/profile');
    return response.data;
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await api.put('/profile', profileData);
    return response.data;
  },

  // Get user activities
  getUserActivities: async () => {
    const response = await api.get('/profile/activities');
    return response.data;
  },
};

export default profileService;