import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Generate access token
export const generateAccessToken = async (userId, role = 'user', additionalData = {}) => {
    const payload = { userId, type: 'access' };
    
    // Add role for admin users
    if (userId === 'admin-system-user') {
        payload.role = 'admin';
        payload.isSystemAdmin = true;
        payload.email = additionalData.email || 'admin@yourdomain.com';
    } else {
        // For regular users, fetch the latest role from database
        try {
            const { User } = await import('../models/users.js');
            const user = await User.findById(userId).select('role email');
            if (user) {
                payload.role = user.role || role;
                payload.email = user.email || additionalData.email;
            } else {
                payload.role = role;
            }
        } catch (error) {
            console.error('Error fetching user role for token:', error);
            payload.role = role;
        }
        
        // Include additional data if provided
        if (additionalData.email && !payload.email) payload.email = additionalData.email;
        if (additionalData.isSystemAdmin !== undefined) payload.isSystemAdmin = additionalData.isSystemAdmin;
    }
    
    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// Generate refresh token
export const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
    );
};

// Generate email verification token
export const generateEmailVerificationToken = (email, userId) => {
    return jwt.sign(
        { email, userId, type: 'email_verification' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// Generate password reset token
export const generatePasswordResetToken = (email, userId) => {
    return jwt.sign(
        { email, userId, type: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
};

// Verify access token
export const verifyAccessToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'access') {
            throw new Error('Invalid token type');
        }
        return decoded;
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }
        return decoded;
    } catch (error) {
        throw new Error('Invalid or expired refresh token');
    }
};

// Verify email verification token
export const verifyEmailVerificationToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'email_verification') {
            throw new Error('Invalid token type');
        }
        return decoded;
    } catch (error) {
        throw new Error('Invalid or expired verification token');
    }
};

// Verify password reset token
export const verifyPasswordResetToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'password_reset') {
            throw new Error('Invalid token type');
        }
        return decoded;
    } catch (error) {
        throw new Error('Invalid or expired reset token');
    }
};

// Generate both tokens
export const generateTokens = async (userId, role = 'user', additionalData = {}) => {
    return {
        accessToken: await generateAccessToken(userId, role, additionalData),
        refreshToken: generateRefreshToken(userId)
    };
};

// Decode token without verification (for debugging)
export const decodeToken = (token) => {
    return jwt.decode(token);
};