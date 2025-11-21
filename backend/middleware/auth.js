import { verifyAccessToken } from '../utils/jwtUtils.js';
import { User } from '../models/users.js';
import httpStatus from 'http-status';
import { logAuth } from '../utils/logger.js';

// JWT Authentication Middleware
export const authenticateJWT = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: 'Access token required'
            });
        }

        // Verify token
        const decoded = verifyAccessToken(token);
        
        // Handle system admin case
        if (decoded.userId === 'admin-system-user' && decoded.isSystemAdmin) {
            req.user = {
                _id: 'admin-system-user',
                email: 'admin@yourdomain.com',
                role: 'admin',
                isSystemAdmin: true
            };
            req.userId = 'admin-system-user';
            next();
            return;
        }
        
        // Find user for regular users
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            logAuth('JWT_AUTH_FAILED', 'unknown', false, { reason: 'User not found' });
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid token'
            });
        }

        // Attach user to request
        req.user = user;
        req.userId = user._id;
        
        next();
    } catch (error) {
        logAuth('JWT_AUTH_FAILED', 'unknown', false, { error: error.message });
        return res.status(httpStatus.UNAUTHORIZED).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// Optional JWT Authentication (doesn't fail if no token)
export const optionalAuthenticateJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = verifyAccessToken(token);
            const user = await User.findById(decoded.userId).select('-password');
            
            if (user) {
                req.user = user;
                req.userId = user._id;
            }
        }
        
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

// Check if user is verified
export const requireVerified = (req, res, next) => {
    if (!req.user.isVerified) {
        return res.status(httpStatus.FORBIDDEN).json({
            success: false,
            message: 'Please verify your email first'
        });
    }
    next();
};