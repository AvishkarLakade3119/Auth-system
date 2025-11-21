import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/users.js';
import { UserProfile } from '../models/userProfile.js';
import { generateTokens } from '../utils/jwtUtils.js';
import { logAuth, logError } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

// Google OAuth Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
            scope: ['profile', 'email']
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check if user already exists with this Google ID
                let user = await User.findOne({ googleId: profile.id });

                if (user) {
                    // User exists, update last login
                    user.lastLogin = new Date();
                    await user.save();
                    
                    logAuth('GOOGLE_LOGIN', user.email, true, { googleId: profile.id });
                    return done(null, user);
                }

                // Check if user exists with same email (registered locally)
                user = await User.findOne({ email: profile.emails[0].value });

                if (user) {
                    // Link Google account to existing user
                    user.googleId = profile.id;
                    user.googleEmail = profile.emails[0].value;
                    user.authProvider = 'google';
                    user.isVerified = true; // Google accounts are pre-verified
                    user.lastLogin = new Date();
                    await user.save();
                    
                    logAuth('GOOGLE_LINK', user.email, true, { googleId: profile.id });
                    return done(null, user);
                }

                // Create new user
                const newUser = new User({
                    googleId: profile.id,
                    email: profile.emails[0].value,
                    googleEmail: profile.emails[0].value,
                    username: profile.emails[0].value.split('@')[0] + '_' + Date.now(), // Generate unique username
                    authProvider: 'google',
                    isVerified: true, // Google accounts are pre-verified
                    lastLogin: new Date()
                });

                await newUser.save();

                // Create user profile
                const newProfile = new UserProfile({
                    user: newUser._id,
                    name: profile.displayName,
                    profilePicture: profile.photos[0]?.value || null,
                    completionPercentage: 20 // Basic info from Google
                });

                await newProfile.save();
                
                logAuth('GOOGLE_REGISTER', newUser.email, true, { googleId: profile.id });
                return done(null, newUser);
                
            } catch (error) {
                logError(error, { context: 'GoogleStrategy' });
                logAuth('GOOGLE_AUTH_ERROR', profile.emails[0]?.value || 'unknown', false, { error: error.message });
                return done(error, null);
            }
        }
    )
);

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;