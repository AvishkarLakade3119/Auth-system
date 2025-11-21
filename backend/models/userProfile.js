import mongoose, { Schema } from "mongoose";

const userProfileSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true
        },
        name: {
            type: String,
            required: false,
            trim: true
        },
        age: {
            type: Number,
            required: false,
            min: 1,
            max: 150
        },
        bio: {
            type: String,
            required: false,
            maxlength: 500
        },
        phone: {
            type: String,
            required: false
        },
        address: {
            type: String,
            required: false
        },
        
        // Enhanced profile features
        profilePicture: {
            type: String,
            default: null // URL to profile picture
        },
        dateOfBirth: {
            type: Date
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'other', 'prefer_not_to_say'],
            default: 'prefer_not_to_say'
        },
        location: {
            city: String,
            state: String,
            country: String,
            zipCode: String
        },
        socialLinks: {
            linkedin: String,
            twitter: String,
            github: String,
            website: String
        },
        preferences: {
            newsletter: {
                type: Boolean,
                default: false
            },
            notifications: {
                email: {
                    type: Boolean,
                    default: true
                },
                sms: {
                    type: Boolean,
                    default: false
                }
            },
            theme: {
                type: String,
                enum: ['light', 'dark', 'auto'],
                default: 'auto'
            },
            language: {
                type: String,
                default: 'en'
            }
        },
        occupation: {
            type: String
        },
        company: {
            type: String
        },
        skills: [{
            type: String
        }],
        interests: [{
            type: String
        }],
        isPublic: {
            type: Boolean,
            default: true
        },
        completionPercentage: {
            type: Number,
            default: 0
        },
        
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }
);






// Update the updatedAt timestamp on save
userProfileSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const UserProfile = mongoose.model("UserProfile", userProfileSchema);

export { UserProfile };