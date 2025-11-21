import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
    {
        email : {
            type : String,
            required : true,
            unique : true
        },
        username : {
            type : String,
            required : true,
            unique : true
        },
        name : {
            type : String,
            default: function() {
                return this.username; // Default to username if name not provided
            }
        },
        password : {
            type : String,
            required : function() {
                return !this.googleId; // Password required only if not using Google OAuth
            }
        },
        
        // JWT tokens
        refreshToken : {
            type : String
        },
        
        // Google OAuth fields
        googleId: {
            type: String,
            unique: true,
            sparse: true // Allows null values to be non-unique
        },
        googleEmail: {
            type: String
        },
        authProvider: {
            type: String,
            enum: ['local', 'google'],
            default: 'local'
        },
        
        resetPasswordToken: {
            type: String,
            // required: false
        },
        resetPasswordExpires: {
            type: Date,
            // required: false
        },

        // New fields for email verification
        isVerified: {
            type: Boolean,
            default: false
        },
        verificationToken: {
            type: String
        },
        verificationExpires: {
            type: Date
        },

        loginOTP: {
            type: String,
            default: null
        },
        loginOTPExpires: {
            type: Date,
            default: null
        },
        
        // Activity tracking
        lastLogin: {
            type: Date
        },
        loginAttempts: {
            type: Number,
            default: 0
        },
        lockUntil: {
            type: Date
        },
        isLocked: {
            type: Boolean,
            default: false
        },
        failedLoginAttempts: {
            type: Number,
            default: 0
        },
        unlockToken: {
            type: String
        },
        unlockTokenExpires: {
            type: Date
        },
        
        // Role and permissions
        role: {
            type: String,
            enum: ['user', 'moderator', 'admin'],
            default: 'user'
        },
        permissions: {
            type: [String],
            default: []
        },
        isActive: {
            type: Boolean,
            default: true
        },
        
        // Soft delete fields for deregistration
        isDeregistered: {
            type: Boolean,
            default: false
        },
        deregisteredAt: {
            type: Date
        },
        deregistrationReason: {
            type: String
        },
        
        createdAt: {
            type: Date,
            default: Date.now,
            // expires: 86400 // Document expires after 24 hours if not verified
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }
)


// Pre-remove hook to delete associated UserProfile
userSchema.pre('remove', async function(next) {
    try {
        // Import UserProfile model
        const { UserProfile } = await import('./userProfile.js');
        
        // Delete the associated profile
        await UserProfile.deleteOne({ user: this._id });
        
        console.log(`Deleted UserProfile for user: ${this._id}`);
        next();
    } catch (error) {
        console.error(`Error deleting UserProfile: ${error.message}`);
        next(error);
    }
});


// Create index for automatic deletion of unverified users
userSchema.index({ createdAt: 1 }, { 
    expireAfterSeconds: 86400,
    partialFilterExpression: { isVerified: false }
});

const User = mongoose.model("User", userSchema);

export { User };