import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Admin credentials from environment variables
export const adminConfig = {
  email: process.env.ADMIN_EMAIL || 'admin@yourdomain.com',
  password: process.env.ADMIN_PASSWORD || 'secureAdminPassword123!',
  role: 'admin',
  name: 'System Administrator'
};

// Pre-hashed password for consistent comparison
// This is the bcrypt hash of 'secureAdminPassword123!'
export const adminPasswordHash = '$2b$10$YourHashHere'; // This will be replaced at runtime

// Function to verify admin password
export const verifyAdminPassword = async (password) => {
  // For file-based admin, we compare against the plain text password from env
  // This is acceptable for a system admin that doesn't exist in the database
  return password === adminConfig.password;
};
