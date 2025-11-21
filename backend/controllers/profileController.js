import { UserProfile } from "../models/userProfile.js";
import { User } from "../models/users.js";
import { UserActivity } from "../models/userActivity.js";
import httpStatus from "http-status";
import { logUserActivity, logError } from "../utils/logger.js";

// Create or update user profile
const updateProfile = async (req, res) => {
    const { 
        name, age, bio, phone, address,
        profilePicture, dateOfBirth, gender,
        location, socialLinks, preferences,
        occupation, company, skills, interests
    } = req.body;
    const userId = req.userId; // From JWT middleware

    try {
        // Ensure we have a valid userId
        if (!userId) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "User not authenticated"
            });
        }

        // Validate age if provided
        if (age && (age < 1 || age > 150)) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: "Age must be between 1 and 150"
            });
        }

        // Check if profile exists
        let profile = await UserProfile.findOne({ user: userId });
        const isNewProfile = !profile;

        if (profile) {
            // Update existing profile
            profile.name = name !== undefined ? name : profile.name;
            profile.age = age !== undefined ? age : profile.age;
            profile.bio = bio !== undefined ? bio : profile.bio;
            profile.phone = phone !== undefined ? phone : profile.phone;
            profile.address = address !== undefined ? address : profile.address;
            profile.profilePicture = profilePicture !== undefined ? profilePicture : profile.profilePicture;
            profile.dateOfBirth = dateOfBirth !== undefined ? dateOfBirth : profile.dateOfBirth;
            profile.gender = gender !== undefined ? gender : profile.gender;
            profile.location = location !== undefined ? { ...profile.location, ...location } : profile.location;
            profile.socialLinks = socialLinks !== undefined ? { ...profile.socialLinks, ...socialLinks } : profile.socialLinks;
            profile.preferences = preferences !== undefined ? { ...profile.preferences, ...preferences } : profile.preferences;
            profile.occupation = occupation !== undefined ? occupation : profile.occupation;
            profile.company = company !== undefined ? company : profile.company;
            profile.skills = skills !== undefined ? skills : profile.skills;
            profile.interests = interests !== undefined ? interests : profile.interests;
            profile.isPublic = req.body.isPublic !== undefined ? req.body.isPublic : profile.isPublic;
            
            // Calculate completion percentage
            profile.completionPercentage = calculateProfileCompletion(profile);
            
            await profile.save();
            
            // Log profile update
            await UserActivity.logActivity(userId, 'PROFILE_UPDATED', req, { 
                fieldsUpdated: Object.keys(req.body),
                success: true 
            });
            logUserActivity(userId, 'PROFILE_UPDATED', { fieldsUpdated: Object.keys(req.body) });
            
            return res.status(httpStatus.OK).json({
                message: "Profile updated successfully",
                profile: profile
            });
        } else {
            // Create new profile
            profile = new UserProfile({
                user: userId,
                name,
                age,
                bio,
                phone,
                address,
                profilePicture,
                dateOfBirth,
                gender,
                location,
                socialLinks,
                preferences,
                occupation,
                company,
                skills,
                interests,
                isPublic: req.body.isPublic !== undefined ? req.body.isPublic : true
            });
            
            // Calculate completion percentage
            profile.completionPercentage = calculateProfileCompletion(profile);
            
            await profile.save();
            
            // Log profile creation
            await UserActivity.logActivity(userId, 'PROFILE_CREATED', req, { 
                success: true 
            });
            logUserActivity(userId, 'PROFILE_CREATED');
            
            return res.status(httpStatus.CREATED).json({
                message: "Profile created successfully",
                profile: profile
            });
        }

    } catch (error) {
        console.error('Profile update error:', error);
        logError(error, { context: 'updateProfile', userId, error: error.message, stack: error.stack });
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Error updating profile",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Helper function to calculate profile completion percentage
const calculateProfileCompletion = (profile) => {
    const fields = [
        'name',
        'age',
        'bio',
        'phone',
        'address',
        'profilePicture',
        'dateOfBirth',
        'gender',
        'location.city',
        'location.country',
        'occupation',
        'company',
        'skills',
        'interests'
    ];
    
    let completedFields = 0;
    
    fields.forEach(field => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            if (profile[parent] && profile[parent][child]) {
                completedFields++;
            }
        } else if (field === 'skills' || field === 'interests') {
            if (profile[field] && profile[field].length > 0) {
                completedFields++;
            }
        } else if (profile[field]) {
            completedFields++;
        }
    });
    
    return Math.round((completedFields / fields.length) * 100);
};

// Get user profile
const getProfile = async (req, res) => {
    const userId = req.userId; // From JWT middleware
    const { targetUserId } = req.query; // Optional: to view other users' public profiles

    try {
        const profileUserId = targetUserId || userId;
        
        // Find profile and populate user details
        const profile = await UserProfile.findOne({ user: profileUserId })
            .populate('user', 'email username isVerified createdAt lastLogin');

        if (!profile) {
            return res.status(httpStatus.NOT_FOUND).json({
                message: "Profile not found"
            });
        }
        
        // Check if profile is public or belongs to requesting user
        if (profileUserId !== userId && !profile.isPublic) {
            return res.status(httpStatus.FORBIDDEN).json({
                message: "This profile is private"
            });
        }
        
        // Log profile view
        if (profileUserId !== userId) {
            await UserActivity.logActivity(profileUserId, 'PROFILE_VIEWED', req, { 
                viewedBy: userId,
                success: true 
            });
        }
        
        // Get recent activities if viewing own profile
        let recentActivities = [];
        if (profileUserId === userId) {
            recentActivities = await UserActivity.getRecentActivities(userId, 5);
        }

        return res.status(httpStatus.OK).json({
            profile: profile,
            recentActivities: profileUserId === userId ? recentActivities : undefined
        });

    } catch (error) {
        logError(error, { context: 'getProfile', userId });
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Error fetching profile"
        });
    }
};

// Get user activities
const getUserActivities = async (req, res) => {
    const userId = req.userId;
    const { limit = 20, offset = 0, action } = req.query;
    
    try {
        const query = { user: userId };
        if (action) {
            query.action = action;
        }
        
        const activities = await UserActivity.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset))
            .select('-__v');
            
        const totalCount = await UserActivity.countDocuments(query);
        
        res.status(httpStatus.OK).json({
            activities,
            pagination: {
                total: totalCount,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: totalCount > parseInt(offset) + parseInt(limit)
            }
        });
        
    } catch (error) {
        logError(error, { context: 'getUserActivities', userId });
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Error fetching activities"
        });
    }
};

export { updateProfile, getProfile, getUserActivities };