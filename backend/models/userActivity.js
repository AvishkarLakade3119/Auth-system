import mongoose, { Schema } from "mongoose";

const userActivitySchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        action: {
            type: String,
            required: true,
            enum: [
                // Authentication actions
                'LOGIN_ATTEMPT',
                'LOGIN_SUCCESS',
                'LOGIN_FAILED',
                'LOGOUT',
                'REGISTER',
                'EMAIL_VERIFIED',
                'PASSWORD_CHANGED',
                'PASSWORD_RESET_REQUEST',
                'PASSWORD_RESET_SUCCESS',
                'ACCOUNT_DELETED',
                
                // OAuth actions
                'GOOGLE_LOGIN',
                'GOOGLE_REGISTER',
                'GOOGLE_LINK',
                
                // Profile actions
                'PROFILE_CREATED',
                'PROFILE_UPDATED',
                'PROFILE_VIEWED',
                'PROFILE_PICTURE_UPDATED',
                
                // Security actions
                'OTP_GENERATED',
                'OTP_VERIFIED',
                'OTP_FAILED',
                'ACCOUNT_LOCKED',
                'ACCOUNT_UNLOCKED',
                
                // Admin actions
                'ADMIN_SESSION_TERMINATE',
                
                // Token actions
                'TOKEN_REFRESHED',
                'TOKEN_REVOKED'
            ]
        },
        details: {
            type: Schema.Types.Mixed,
            default: {}
        },
        ipAddress: {
            type: String
        },
        userAgent: {
            type: String
        },
        location: {
            country: String,
            city: String,
            region: String,
            latitude: Number,
            longitude: Number
        },
        device: {
            type: String,
            browser: String,
            os: String,
            platform: String
        },
        success: {
            type: Boolean,
            default: true
        },
        errorMessage: {
            type: String
        },
        sessionId: {
            type: String
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    },
    {
        // Options
        timestamps: false, // We're using our own timestamp field
        collection: 'user_activities'
    }
);

// Indexes for efficient querying
userActivitySchema.index({ user: 1, timestamp: -1 });
userActivitySchema.index({ action: 1, timestamp: -1 });
userActivitySchema.index({ 'location.country': 1 });
userActivitySchema.index({ timestamp: -1 });

// TTL index to automatically delete old activity logs after 90 days
userActivitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Static method to log activity
userActivitySchema.statics.logActivity = async function(userId, action, req, additionalDetails = {}) {
    try {
        // Skip activity logging for file-based admin users
        if (userId === 'admin-system-user') {
            console.log('Skipping activity log for system admin user');
            return null;
        }
        
        const activity = new this({
            user: userId,
            action: action,
            details: additionalDetails,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            success: additionalDetails.success !== undefined ? additionalDetails.success : true,
            errorMessage: additionalDetails.error || null
        });
        
        await activity.save();
        return activity;
    } catch (error) {
        console.error('Error logging activity:', error);
        // Don't throw error to prevent disrupting the main flow
    }
};

// Method to get user's recent activities
userActivitySchema.statics.getRecentActivities = async function(userId, limit = 10) {
    return this.find({ user: userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .select('-__v');
};

// Method to get suspicious activities
userActivitySchema.statics.getSuspiciousActivities = async function(userId) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return this.find({
        user: userId,
        timestamp: { $gte: oneDayAgo },
        $or: [
            { action: 'LOGIN_FAILED', success: false },
            { action: 'OTP_FAILED', success: false },
            { action: 'ACCOUNT_LOCKED' }
        ]
    }).sort({ timestamp: -1 });
};

const UserActivity = mongoose.model("UserActivity", userActivitySchema);

export { UserActivity };