import jwt from 'jsonwebtoken';
import { adminConfig } from '../config/adminConfig.js';
import { verifyAccessToken } from '../utils/jwtUtils.js';
import { User } from '../models/users.js';

export const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied'
      });
    }

    // Use the same token verification as regular auth
    const decoded = verifyAccessToken(token);
    
    console.log('Admin auth check - decoded token:', {
      userId: decoded.userId || decoded.id,
      isSystemAdmin: decoded.isSystemAdmin,
      role: decoded.role,
      email: decoded.email
    });
    
    // Handle system admin case
    if (decoded.userId === 'admin-system-user' && decoded.isSystemAdmin) {
      req.user = {
        _id: 'admin-system-user',
        email: decoded.email || 'admin@yourdomain.com',
        role: 'admin',
        isSystemAdmin: true,
        isActive: true
      };
      req.userId = 'admin-system-user';
      req.isSystemAdmin = true;
      req.userRole = 'admin';
      next();
      return;
    }
    
    // Get the user from database to check current role
    const userId = decoded.userId || decoded.id;
    const user = await User.findById(userId).select('role email isActive');
    
    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User not found or inactive'
      });
    }
    
    console.log('User from database:', {
      id: user._id,
      role: user.role,
      email: user.email
    });
    
    // Check if it's admin (either system admin, role-based admin, or database admin role)
    if (decoded.isSystemAdmin || decoded.role === 'admin' || user.role === 'admin') {
      req.user = {
        ...decoded,
        role: user.role, // Use the role from database
        email: user.email
      };
      req.userId = userId;
      req.isSystemAdmin = decoded.isSystemAdmin || false;
      req.userRole = user.role;
      next();
    } else {
      console.log('Access denied - user does not have admin privileges');
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(401).json({
      success: false,
      message: 'Token is not valid',
      error: error.message
    });
  }
};