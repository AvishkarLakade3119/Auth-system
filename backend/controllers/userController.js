import {User} from "../models/users.js";
import { UserProfile } from "../models/userProfile.js";
import { UserActivity } from "../models/userActivity.js";
import httpStatus from "http-status";
import bcrypt, {hash} from "bcrypt";
import axios from "axios";
import nodemailer from "nodemailer";
import { 
    generateTokens, 
    generateEmailVerificationToken, 
    generatePasswordResetToken,
    verifyEmailVerificationToken,
    verifyPasswordResetToken 
} from "../utils/jwtUtils.js";
import { logAuth, logUserActivity, logError } from "../utils/logger.js";
import { adminConfig } from "../config/adminConfig.js";
import { sessionManager } from "../utils/sessionManager.js";


// Configure email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can use other services like SendGrid, AWS SES, etc.
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});


// Helper function to generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};



// Helper function to verify reCAPTCHA
const verifyRecaptcha = async (token) => {
    try {
        const response = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            {
                params: {
                    secret: process.env.RECAPTCHA_SECRET_KEY,
                    response: token
                }
            }
        );
        
        return response.data.success;
    } catch (error) {
        console.error('reCAPTCHA verification error:', error);
        return false;
    }
};




// login controller function
const login = async (req,res) => {
    const {username, password, captchaToken} = req.body;

    if (!username || !password){
        return res.status(400).json({message : "Please enter the username and password"});
    }

    // Check if it's admin login attempt using email as username
    const isSystemAdmin = username === adminConfig.email;

    // Skip captcha verification for system admin or admin-bypass token
    if (!isSystemAdmin && captchaToken !== 'admin-bypass') {
        // Verify captcha token for regular users
        if (!captchaToken) {
            return res.status(httpStatus.BAD_REQUEST).json({message : "Please complete the captcha verification"});
        }

        const isCaptchaValid = await verifyRecaptcha(captchaToken);
        if (!isCaptchaValid) {
            return res.status(httpStatus.BAD_REQUEST).json({message : "Invalid captcha verification"});
        }
    }

    // Check if it's admin login attempt using email as username
    if (username === adminConfig.email) {
        try {
            console.log('Admin login attempt detected');
            console.log('Expected email:', adminConfig.email);
            console.log('Received username:', username);
            console.log('Expected password:', adminConfig.password);
            console.log('Received password:', password);
            
            // Validate admin password using simple comparison for file-based admin
            const isPasswordValid = password === adminConfig.password;
            
            if (!isPasswordValid) {
                // Skip activity logging for admin-system-user (handled in model)
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
            
            // Generate tokens for system admin
            const tokens = await generateTokens('admin-system-user', 'admin', {
                email: adminConfig.email,
                isSystemAdmin: true
            });
            
            // Add session to session manager for system admin
            const sessionId = `session_admin-system-user_${Date.now()}`;
            sessionManager.addSession(sessionId, {
                userId: 'admin-system-user',
                user: {
                    _id: 'admin-system-user',
                    email: adminConfig.email,
                    name: adminConfig.name,
                    username: adminConfig.email
                },
                ipAddress: req.ip || 'Unknown',
                loginTime: new Date(),
                lastActivity: new Date(),
                status: 'active',
                userAgent: req.get('user-agent') || 'Unknown'
            });
            
            // Skip activity logging for admin-system-user (handled in model)
            logAuth('ADMIN_LOGIN_SUCCESS', adminConfig.email, true, { method: 'file-based' });

            return res.status(200).json({
                success: true,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                token: tokens.accessToken, // Add for compatibility
                user: {
                    id: 'admin-system-user',
                    email: adminConfig.email,
                    username: adminConfig.email,
                    name: adminConfig.name,
                    role: 'admin',
                    isSystemAdmin: true
                },
                message: "Admin login successful"
            });
        } catch (error) {
            logError(error, { context: 'admin login', username });
            return res.status(500).json({message : "Admin login error: " + error.message});
        }
    }

    // Also check if it's a user with admin role trying to login
    const adminUser = await User.findOne({ email: username, role: 'admin', isDeregistered: { $ne: true } });
    if (adminUser) {
        try {
            console.log('Admin user login attempt detected');
            console.log('Admin user email:', adminUser.email);
            
            // Skip captcha for admin users
            const isPasswordValid = await bcrypt.compare(password, adminUser.password);
            
            if (!isPasswordValid) {
                await UserActivity.logActivity(adminUser._id, 'LOGIN_FAILED', req, { 
                    reason: 'Invalid password',
                    success: false 
                });
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Skip email verification check for admin users
            // Admin users should be pre-verified or have special privileges
            if (!adminUser.isVerified) {
                // Auto-verify admin users on first login
                adminUser.isVerified = true;
                console.log('Auto-verifying admin user:', adminUser.email);
            }

            // Check if account is locked
            if (adminUser.isLocked || (adminUser.lockUntil && adminUser.lockUntil > Date.now())) {
                await UserActivity.logActivity(adminUser._id, 'LOGIN_FAILED', req, { 
                    reason: 'Account locked',
                    success: false 
                });
                return res.status(httpStatus.LOCKED).json({
                    message: "Account is locked due to multiple failed attempts.",
                    isLocked: true
                });
            }

            // Generate tokens for admin user with role
            const tokens = await generateTokens(adminUser._id.toString(), 'admin', {
                email: adminUser.email,
                isSystemAdmin: false
            });
            adminUser.refreshToken = tokens.refreshToken;
            adminUser.lastLogin = new Date();
            adminUser.loginAttempts = 0;
            adminUser.failedLoginAttempts = 0;
            await adminUser.save();
            
            // Add session to session manager for admin user
            const sessionId = `session_${adminUser._id}_${Date.now()}`;
            sessionManager.addSession(sessionId, {
                userId: adminUser._id.toString(),
                user: {
                    _id: adminUser._id,
                    email: adminUser.email,
                    name: adminUser.name || adminUser.username || 'Admin',
                    username: adminUser.username
                },
                ipAddress: req.ip || 'Unknown',
                loginTime: new Date(),
                lastActivity: new Date(),
                status: 'active',
                userAgent: req.get('user-agent') || 'Unknown'
            });
            
            // Log successful admin login
            await UserActivity.logActivity(adminUser._id, 'ADMIN_LOGIN_SUCCESS', req, { 
                method: 'database',
                success: true 
            });
            logAuth('ADMIN_LOGIN_SUCCESS', adminUser.email, true, { method: 'database' });

            return res.status(200).json({
                success: true,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                user: {
                    id: adminUser._id,
                    email: adminUser.email,
                    username: adminUser.username,
                    name: adminUser.name || adminUser.username,
                    role: 'admin',
                    isSystemAdmin: false
                },
                message: "Admin login successful"
            });
        } catch (error) {
            logError(error, { context: 'admin user login', username });
            return res.status(500).json({message : "Admin login error: " + error.message});
        }
    }


    try{
        const user = await User.findOne({username, isDeregistered: { $ne: true }});
        if (!user){
            // Log failed login attempt
            await UserActivity.logActivity(null, 'LOGIN_FAILED', req, { 
                username, 
                reason: 'User not found',
                success: false 
            });
            logAuth('LOGIN_ATTEMPT', username, false, { reason: 'User not found' });
            return res.status(httpStatus.NOT_FOUND).json({message : "No user exist with the username " + username});
        }

         // Check if user is verified
        if (!user.isVerified) {
            await UserActivity.logActivity(user._id, 'LOGIN_FAILED', req, { 
                reason: 'Email not verified',
                success: false 
            });
            logAuth('LOGIN_ATTEMPT', user.email, false, { reason: 'Email not verified' });
            
            // Generate new verification token and send email
            const verificationToken = generateEmailVerificationToken(user.email, user._id);
            const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
            
            // Send verification email again
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: 'Verify Your Email - Resent',
                html: `
                    <h2>Email Verification Required</h2>
                    <p>Hello ${user.username},</p>
                    <p>You need to verify your email before logging in. Click the link below to verify:</p>
                    <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
                    <p>Or copy and paste this link in your browser:</p>
                    <p>${verificationUrl}</p>
                    <p>This link will expire in 24 hours.</p>
                    <br>
                    <p>Best regards,<br>Your App Team</p>
                `
            };
            
            try {
                await transporter.sendMail(mailOptions);
                return res.status(httpStatus.UNAUTHORIZED).json({
                    message: "Please verify your email before logging in. A new verification email has been sent.",
                    emailSent: true
                });
            } catch (emailError) {
                console.error('Failed to send verification email:', emailError);
                return res.status(httpStatus.UNAUTHORIZED).json({
                    message: "Please verify your email before logging in. Contact support if you need a new verification email.",
                    emailSent: false
                });
            }
        }

        // Check if account is locked
        if (user.isLocked || (user.lockUntil && user.lockUntil > Date.now())) {
            await UserActivity.logActivity(user._id, 'LOGIN_FAILED', req, { 
                reason: 'Account locked',
                success: false 
            });
            logAuth('LOGIN_ATTEMPT', user.email, false, { reason: 'Account locked' });
            return res.status(httpStatus.LOCKED).json({
                message: "Account is locked due to multiple failed attempts. Please check your email for unlock instructions.",
                isLocked: true
            });
        }

        let ispasscorrect = await bcrypt.compare(password, user.password);

        if (ispasscorrect){
            // Reset login attempts on successful password
            user.loginAttempts = 0;
            user.failedLoginAttempts = 0;
            user.lockUntil = undefined;
            user.isLocked = false;
            
            // Generate OTP instead of token
            const otp = generateOTP();
            const otpExpiry = Date.now() + 600000; // 10 minutes
            
            // Store OTP and expiry in user document
            user.loginOTP = otp;
            user.loginOTPExpires = otpExpiry;
            await user.save();
            
            // Log OTP generation
            await UserActivity.logActivity(user._id, 'OTP_GENERATED', req, { 
                purpose: 'login',
                success: true 
            });
            logUserActivity(user._id, 'OTP_GENERATED', { purpose: 'login' });
            
            // Send OTP email
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: 'Your Login OTP',
                html: `
                    <h2>Login Verification</h2>
                    <p>Hello ${user.username},</p>
                    <p>Your OTP for login is: <strong style="font-size: 24px; color: #007bff;">${otp}</strong></p>
                    <p>This OTP will expire in 10 minutes.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                    <br>
                    <p>Best regards,<br>Your App Team</p>
                `
            };
            
            await transporter.sendMail(mailOptions);
            
            // Return success with OTP sent status
            return res.status(httpStatus.OK).json({
                requiresOTP: true,
                message: "OTP sent to your email",
                email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Partially hide email
            });
        }
        else{
            // Increment login attempts
            user.loginAttempts = (user.loginAttempts || 0) + 1;
            user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
            
            // Lock account after 3 consecutive failed attempts
            if (user.failedLoginAttempts >= 3) {
                user.isLocked = true;
                user.lockUntil = Date.now() + 30 * 60 * 1000; // Lock for 30 minutes
                
                // Generate unlock token
                const unlockToken = generateEmailVerificationToken(user.email, user._id);
                user.unlockToken = unlockToken;
                user.unlockTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
                
                await UserActivity.logActivity(user._id, 'ACCOUNT_LOCKED', req, { 
                    reason: 'Too many failed login attempts',
                    attempts: user.failedLoginAttempts
                });
                logAuth('ACCOUNT_LOCKED', user.email, false, { attempts: user.failedLoginAttempts });
                
                // Send unlock email
                const unlockUrl = `${process.env.FRONTEND_URL}/unlock-account?token=${unlockToken}`;
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: 'Account Locked - Unlock Required',
                    html: `
                        <h2>Account Locked</h2>
                        <p>Hello ${user.username},</p>
                        <p>Your account has been locked due to 3 consecutive failed login attempts.</p>
                        <p>To unlock your account and re-register, please click the link below:</p>
                        <a href="${unlockUrl}" style="display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px;">Unlock Account</a>
                        <p>Or copy and paste this link in your browser:</p>
                        <p>${unlockUrl}</p>
                        <p>This link will expire in 24 hours.</p>
                        <p>If you didn't attempt to login, please contact support immediately.</p>
                        <br>
                        <p>Best regards,<br>Your App Team</p>
                    `
                };
                
                await transporter.sendMail(mailOptions);
            }
            
            await user.save();
            
            await UserActivity.logActivity(user._id, 'LOGIN_FAILED', req, { 
                reason: 'Invalid password',
                attempts: user.failedLoginAttempts,
                success: false 
            });
            logAuth('LOGIN_ATTEMPT', user.email, false, { reason: 'Invalid password' });
            
            const attemptsRemaining = 3 - user.failedLoginAttempts;
            const message = user.isLocked 
                ? "Account locked due to too many failed attempts. Please check your email for unlock instructions."
                : attemptsRemaining > 0 
                    ? `Invalid username or password. ${attemptsRemaining} attempt${attemptsRemaining > 1 ? 's' : ''} remaining.`
                    : "Invalid username or password";
            
            return res.status(httpStatus.UNAUTHORIZED).json({
                message,
                attemptsRemaining: attemptsRemaining > 0 ? attemptsRemaining : 0,
                isLocked: user.isLocked
            });
        }
    }
    catch (e) {
        logError(e, { context: 'login', username });
        return res.status(500).json({message : "Something went wrong" + e});
    }
}




// New controller function to verify OTP
const verifyLoginOTP = async (req, res) => {
    const { username, otp } = req.body;
    
    if (!username || !otp) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Username and OTP are required"
        });
    }
    
    try {
        const user = await User.findOne({ username, isDeregistered: { $ne: true } });
        
        if (!user) {
            await UserActivity.logActivity(null, 'OTP_FAILED', req, { 
                username,
                reason: 'Invalid username',
                success: false 
            });
            return res.status(httpStatus.NOT_FOUND).json({
                message: "Invalid username"
            });
        }
        
        // Check if OTP matches and hasn't expired
        if (user.loginOTP !== otp) {
            await UserActivity.logActivity(user._id, 'OTP_FAILED', req, { 
                reason: 'Invalid OTP',
                success: false 
            });
            logAuth('OTP_VERIFICATION', user.email, false, { reason: 'Invalid OTP' });
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "Invalid OTP"
            });
        }
        
        if (user.loginOTPExpires < Date.now()) {
            await UserActivity.logActivity(user._id, 'OTP_FAILED', req, { 
                reason: 'OTP expired',
                success: false 
            });
            logAuth('OTP_VERIFICATION', user.email, false, { reason: 'OTP expired' });
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "OTP has expired. Please login again"
            });
        }
        
        // Clear OTP fields and reset failed attempts
        user.loginOTP = undefined;
        user.loginOTPExpires = undefined;
        user.lastLogin = new Date();
        user.failedLoginAttempts = 0;
        user.isLocked = false;
        
        // Generate JWT tokens instead of crypto token
        const tokens = await generateTokens(user._id, user.role || 'user', {
            email: user.email,
            isSystemAdmin: user.isSystemAdmin || false
        });
        user.refreshToken = tokens.refreshToken;
        await user.save();
        
        // Add session to session manager
        const sessionId = `session_${user._id}_${Date.now()}`;
        sessionManager.addSession(sessionId, {
            userId: user._id.toString(),
            user: {
                _id: user._id,
                email: user.email,
                name: user.name || user.username || 'Unknown',
                username: user.username
            },
            ipAddress: req.ip || 'Unknown',
            loginTime: new Date(),
            lastActivity: new Date(),
            status: 'active',
            userAgent: req.get('user-agent') || 'Unknown'
        });
        
        // Log successful login
        await UserActivity.logActivity(user._id, 'LOGIN_SUCCESS', req, { 
            method: '2FA_OTP',
            success: true 
        });
        await UserActivity.logActivity(user._id, 'OTP_VERIFIED', req, { 
            purpose: 'login',
            success: true 
        });
        logAuth('LOGIN_SUCCESS', user.email, true, { method: '2FA_OTP' });
        logUserActivity(user._id, 'LOGIN_SUCCESS', { method: '2FA_OTP' });
        
        return res.status(httpStatus.OK).json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user._id,
                email: user.email,
                username: user.username
            },
            message: "Login successful"
        });
        
    } catch (error) {
        logError(error, { context: 'verifyLoginOTP', username });
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Error verifying OTP"
        });
    }
};




// registration controller function
const register = async (req, res) => {

    const {username, email, password, recaptchaToken} = req.body;

    // console.log(recaptchaToken)
    // Verify captcha token
    if (!recaptchaToken) {
        return res.status(httpStatus.BAD_REQUEST).json({message : "Please complete the captcha verification"});
    }

    const isCaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!isCaptchaValid) {
        return res.status(httpStatus.BAD_REQUEST).json({message : "Invalid captcha verification"});
    }

    try{

        const existing = await User.findOne({
            $or: [
                { username: username, isDeregistered: { $ne: true } },
                { email: email, isDeregistered: { $ne: true } }
            ]
        });
        
        if (existing){
            if (existing.username === username) {
                return res.status(httpStatus.FOUND).json({message : "Username already exists"});
            }
            if (existing.email === email) {
                return res.status(httpStatus.FOUND).json({message : "Email already registered"});
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let newUser = new User(
            {
                email : email,
                username : username,
                password : hashedPassword,
                isVerified: false,
                authProvider: 'local',
                createdAt: Date.now()
            }
        )

        await newUser.save();
        
        // Generate JWT verification token
        const verificationToken = generateEmailVerificationToken(email, newUser._id);

        // Create verification URL
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

        // Email message
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: newUser.email,
            subject: 'Verify Your Email - Action Required',
            html: `
                <h2>Email Verification Required</h2>
                <p>Hello ${newUser.username},</p>
                <p>Thank you for registering! Please verify your email address to complete your registration.</p>
                <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
                <p>Or copy and paste this link in your browser:</p>
                <p>${verificationUrl}</p>
                <p><strong>Important:</strong> This link will expire in 24 hours.</p>
                <p>If you didn't create this account, please ignore this email.</p>
                <br>
                <p>Best regards,<br>Your App Team</p>
            `
        };

        // Send verification email
        await transporter.sendMail(mailOptions);
        
        // Log registration activity
        await UserActivity.logActivity(newUser._id, 'REGISTER', req, { 
            email: newUser.email,
            username: newUser.username,
            authProvider: 'local',
            success: true 
        });
        logAuth('REGISTER', newUser.email, true, { username: newUser.username });
        logUserActivity(newUser._id, 'REGISTER', { authProvider: 'local' });

        res.status(httpStatus.CREATED).json({
            message : "Registration successful! Please check your email to verify your account.",
            requiresVerification: true
        })

    }
    catch (e) {
        res.status(500).json({message : "Something went wrong: " + e.message});
    }

}


// Email verification controller function
const verifyEmail = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(httpStatus.BAD_REQUEST).json({ 
            message: "Verification token is required" 
        });
    }

    try {
        // Verify JWT token
        const decoded = verifyEmailVerificationToken(token);
        const { email, userId } = decoded;

        // Find user
        const user = await User.findOne({
            _id: userId,
            email: email,
            isVerified: false
        });

        if (!user) {
            // Check if user exists but is already verified
            const existingUser = await User.findOne({ _id: userId, email: email });
            if (existingUser && existingUser.isVerified) {
                // User is already verified - return success
                await UserActivity.logActivity(userId, 'EMAIL_VERIFIED', req, { 
                    reason: 'Already verified',
                    success: true 
                });
                return res.status(httpStatus.OK).json({ 
                    message: "Email already verified. You can now login.",
                    alreadyVerified: true
                });
            }
            
            // User not found or other issue
            await UserActivity.logActivity(userId, 'EMAIL_VERIFIED', req, { 
                reason: 'User not found',
                success: false 
            });
            return res.status(httpStatus.BAD_REQUEST).json({ 
                message: "Invalid verification link." 
            });
        }

        // Mark user as verified
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationExpires = undefined;
        
        // Generate JWT tokens for immediate access
        const tokens = await generateTokens(user._id);
        user.refreshToken = tokens.refreshToken;
        user.lastLogin = new Date();
        
        await user.save();
        
        // Check if user profile already exists before creating
        const existingProfile = await UserProfile.findOne({ user: user._id });
        
        if (!existingProfile) {
            // Create user profile only if it doesn't exist
            const userProfile = new UserProfile({
                user: user._id,
                completionPercentage: 10
            });
            await userProfile.save();
            
            // Log profile creation only if we actually created it
            await UserActivity.logActivity(user._id, 'PROFILE_CREATED', req, { 
                success: true 
            });
        }
        
        // Log email verification
        await UserActivity.logActivity(user._id, 'EMAIL_VERIFIED', req, { 
            email: user.email,
            success: true 
        });
        logAuth('EMAIL_VERIFIED', user.email, true);
        logUserActivity(user._id, 'EMAIL_VERIFIED');

        // Send welcome email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Welcome! Email Verified Successfully',
            html: `
                <h2>Welcome ${user.username}!</h2>
                <p>Your email has been successfully verified.</p>
                <p>You can now log in to your account and enjoy all features.</p>
                <br>
                <p>Best regards,<br>Your App Team</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(httpStatus.OK).json({ 
            message: "Email verified successfully!",
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user._id,
                email: user.email,
                username: user.username
            }
        });

    } catch (error) {
        logError(error, { context: 'verifyEmail' });
        
        // Handle duplicate key error specifically
        if (error.code === 11000 && error.message.includes('userprofiles')) {
            // This means the user profile already exists, which is fine
            // Return success since the email is already verified
            return res.status(httpStatus.OK).json({ 
                message: "Email already verified. You can now login.",
                alreadyVerified: true
            });
        }
        
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ 
            message: error.message || "Error verifying email" 
        });
    }
};



// change password controller function
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId; // This should come from JWT middleware

    // Validate input
    if (!currentPassword || !newPassword) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Please provide both current password and new password"
        });
    }

    // Validate new password strength
    if (newPassword.length < 6) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "New password must be at least 6 characters long"
        });
    }

    // Check if new password is same as current password
    if (currentPassword === newPassword) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "New password must be different from current password"
        });
    }

    try {
        // Find user by ID from JWT
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "User not found"
            });
        }

        // Verify current password
        const isCurrentPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
        
        if (!isCurrentPasswordCorrect) {
            await UserActivity.logActivity(user._id, 'PASSWORD_CHANGED', req, { 
                reason: 'Incorrect current password',
                success: false 
            });
            logAuth('PASSWORD_CHANGE_ATTEMPT', user.email, false, { reason: 'Incorrect current password' });
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "Current password is incorrect"
            });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        user.password = hashedNewPassword;
        // Generate new tokens for security
        const tokens = await generateTokens(user._id);
        user.refreshToken = tokens.refreshToken;
        await user.save();
        
        // Log password change
        await UserActivity.logActivity(user._id, 'PASSWORD_CHANGED', req, { 
            success: true 
        });
        logAuth('PASSWORD_CHANGED', user.email, true);
        logUserActivity(user._id, 'PASSWORD_CHANGED');

        // Send password change confirmation email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Changed Successfully',
            html: `
                <h2>Password Changed</h2>
                <p>Hello ${user.username},</p>
                <p>Your password has been successfully changed on ${new Date().toLocaleString()}.</p>
                <p><strong>Important:</strong> If you did not make this change, please contact our support team immediately.</p>
                <br>
                <p>Best regards,<br>Your App Team</p>
            `
        };

        await transporter.sendMail(mailOptions);

        return res.status(httpStatus.OK).json({
            success: true,
            message: "Password changed successfully",
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        });

    } catch (error) {
        logError(error, { context: 'changePassword', userId });
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Error changing password"
        });
    }
};


// Forgot password controller function
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Please provide an email address" });
    }

    try {
        // Find user by email
        const user = await User.findOne({ email });
        
        if (!user) {
            // Don't reveal if email exists for security reasons
            return res.status(httpStatus.OK).json({ 
                message: "If an account exists with this email, you will receive a password reset link" 
            });
        }

        // Check if user is verified
        if (!user.isVerified) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
                message: "Please verify your email first before resetting password" 
            });
        }

        // Generate JWT reset token
        const resetToken = generatePasswordResetToken(email, user._id);
        
        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        // Email message
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset Request',
            html: `
                <h2>Password Reset Request</h2>
                <p>Hello ${user.username},</p>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
                <p>Or copy and paste this link in your browser:</p>
                <p>${resetUrl}</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <br>
                <p>Best regards,<br>Your App Team</p>
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);
        
        // Log password reset request
        await UserActivity.logActivity(user._id, 'PASSWORD_RESET_REQUEST', req, { 
            email: user.email,
            success: true 
        });
        logAuth('PASSWORD_RESET_REQUEST', user.email, true);
        logUserActivity(user._id, 'PASSWORD_RESET_REQUEST');

        res.status(httpStatus.OK).json({ 
            message: "If an account exists with this email, you will receive a password reset link" 
        });

    } catch (error) {
        console.error("Forgot password error:", error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ 
            message: "Error processing password reset request" 
        });
    }
};


// Reset password controller function
const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(httpStatus.BAD_REQUEST).json({ 
            message: "Please provide token and new password" 
        });
    }

    try {
        // Verify JWT token
        const decoded = verifyPasswordResetToken(token);
        const { email, userId } = decoded;

        // Find user
        const user = await User.findOne({
            _id: userId,
            email: email
        });

        if (!user) {
            await UserActivity.logActivity(userId, 'PASSWORD_RESET_SUCCESS', req, { 
                reason: 'User not found',
                success: false 
            });
            return res.status(httpStatus.BAD_REQUEST).json({ 
                message: "Invalid reset token" 
            });
        }

        // Validate password strength (add more validation as needed)
        if (newPassword.length < 6) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
                message: "Password must be at least 6 characters long" 
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        // Reset login attempts and unlock account
        user.loginAttempts = 0;
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        user.isLocked = false;
        user.unlockToken = undefined;
        user.unlockTokenExpires = undefined;
        await user.save();
        
        // Log password reset
        await UserActivity.logActivity(user._id, 'PASSWORD_RESET_SUCCESS', req, { 
            email: user.email,
            success: true 
        });
        logAuth('PASSWORD_RESET_SUCCESS', user.email, true);
        logUserActivity(user._id, 'PASSWORD_RESET_SUCCESS');

        // Send confirmation email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset Successful',
            html: `
                <h2>Password Reset Successful</h2>
                <p>Hello ${user.username},</p>
                <p>Your password has been successfully reset.</p>
                <p>If you didn't make this change, please contact support immediately.</p>
                <br>
                <p>Best regards,<br>Your App Team</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(httpStatus.OK).json({ 
            message: "Password reset successful" 
        });

    } catch (error) {
        logError(error, { context: 'resetPassword' });
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ 
            message: error.message || "Error resetting password" 
        });
    }
};




// delete user account controller function 
const deleteAccount = async (req, res) => {
  try {
    const userId = req.userId; // This should come from JWT middleware

    if (!userId) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Log account deletion
    await UserActivity.logActivity(userId, 'ACCOUNT_DELETED', req, { 
        email: user.email,
        username: user.username,
        success: true 
    });
    logAuth('ACCOUNT_DELETED', user.email, true);
    logUserActivity(userId, 'ACCOUNT_DELETED');
    
    // Delete user activities
    await UserActivity.deleteMany({ user: userId });
    
    // Delete profile first (due to foreign key constraint)
    await UserProfile.deleteOne({user: userId});
    
    // Delete user account
    await User.deleteOne({_id: userId});
    
    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    logError(error, { context: 'deleteAccount', userId: req.userId });
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
};


// Google OAuth callback
const googleCallback = async (req, res) => {
    try {
        const user = req.user; // From passport
        
        if (!user) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
        }
        
        // Generate tokens
        const tokens = await generateTokens(user._id);
        
        // Update user with refresh token
        user.refreshToken = tokens.refreshToken;
        user.lastLogin = new Date();
        await user.save();
        
        // Check if user profile exists, create if not
        const existingProfile = await UserProfile.findOne({ user: user._id });
        if (!existingProfile) {
            const userProfile = new UserProfile({
                user: user._id,
                completionPercentage: 10
            });
            await userProfile.save();
        }
        
        // Log Google login
        await UserActivity.logActivity(user._id, 'GOOGLE_LOGIN', req, { 
            email: user.email,
            success: true 
        });
        logAuth('GOOGLE_LOGIN', user.email, true);
        logUserActivity(user._id, 'GOOGLE_LOGIN');
        
        // Redirect to frontend with tokens
        const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?` +
            `accessToken=${tokens.accessToken}&` +
            `refreshToken=${tokens.refreshToken}&` +
            `userId=${user._id}&` +
            `email=${user.email}&` +
            `username=${user.username}`;
            
        res.redirect(redirectUrl);
        
    } catch (error) {
        logError(error, { context: 'googleCallback' });
        res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
};

// Logout controller
const logout = async (req, res) => {
    try {
        const userId = req.userId;
        
        if (userId) {
            // Clear refresh token
            await User.findByIdAndUpdate(userId, { 
                refreshToken: null 
            });
            
            // Remove user sessions from session manager
            const userSessions = sessionManager.findSessionsByUserId(userId);
            userSessions.forEach(session => {
                sessionManager.removeSession(session._id);
            });
            
            // Log logout
            await UserActivity.logActivity(userId, 'LOGOUT', req, { 
                success: true 
            });
            logUserActivity(userId, 'LOGOUT');
        }
        
        res.status(httpStatus.OK).json({
            success: true,
            message: 'Logged out successfully'
        });
        
    } catch (error) {
        logError(error, { context: 'logout' });
        res.status(httpStatus.OK).json({
            success: true,
            message: 'Logged out successfully'
        });
    }
};

// Refresh token controller
const refreshToken = async (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: 'Refresh token required'
        });
    }
    
    try {
        // Verify refresh token
        const decoded = verifyRefreshToken(refreshToken);
        
        // Find user
        const user = await User.findOne({
            _id: decoded.userId,
            refreshToken: refreshToken
        });
        
        if (!user) {
            await UserActivity.logActivity(decoded.userId, 'TOKEN_REFRESHED', req, { 
                reason: 'Invalid refresh token',
                success: false 
            });
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: 'Invalid refresh token'
            });
        }
        
        // Generate new tokens
        const tokens = await generateTokens(user._id);
        
        // Update refresh token
        user.refreshToken = tokens.refreshToken;
        await user.save();
        
        // Log token refresh
        await UserActivity.logActivity(user._id, 'TOKEN_REFRESHED', req, { 
            success: true 
        });
        
        res.status(httpStatus.OK).json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        });
        
    } catch (error) {
        logError(error, { context: 'refreshToken' });
        return res.status(httpStatus.UNAUTHORIZED).json({
            message: 'Invalid or expired refresh token'
        });
    }
};

// Unlock account controller function
const unlockAccount = async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(httpStatus.BAD_REQUEST).json({ 
            message: "Please provide unlock token and new password" 
        });
    }

    try {
        // Verify unlock token (using same verification as email verification)
        const decoded = verifyEmailVerificationToken(token);
        const { email, userId } = decoded;

        // Find user
        const user = await User.findOne({
            _id: userId,
            email: email,
            isLocked: true,
            unlockToken: token
        });

        if (!user) {
            await UserActivity.logActivity(userId, 'ACCOUNT_UNLOCK_FAILED', req, { 
                reason: 'Invalid unlock token',
                success: false 
            });
            return res.status(httpStatus.BAD_REQUEST).json({ 
                message: "Invalid or expired unlock token" 
            });
        }

        // Check if token is expired
        if (user.unlockTokenExpires < Date.now()) {
            await UserActivity.logActivity(user._id, 'ACCOUNT_UNLOCK_FAILED', req, { 
                reason: 'Token expired',
                success: false 
            });
            return res.status(httpStatus.BAD_REQUEST).json({ 
                message: "Unlock token has expired. Please contact support." 
            });
        }

        // Validate password strength
        if (newPassword.length < 6) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
                message: "Password must be at least 6 characters long" 
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user - unlock account and reset password
        user.password = hashedPassword;
        user.isLocked = false;
        user.failedLoginAttempts = 0;
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        user.unlockToken = undefined;
        user.unlockTokenExpires = undefined;
        
        // Generate new tokens for immediate access
        const tokens = await generateTokens(user._id);
        user.refreshToken = tokens.refreshToken;
        user.lastLogin = new Date();
        
        await user.save();
        
        // Log account unlock
        await UserActivity.logActivity(user._id, 'ACCOUNT_UNLOCKED', req, { 
            email: user.email,
            success: true 
        });
        logAuth('ACCOUNT_UNLOCKED', user.email, true);
        logUserActivity(user._id, 'ACCOUNT_UNLOCKED');

        // Send confirmation email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Account Unlocked Successfully',
            html: `
                <h2>Account Unlocked</h2>
                <p>Hello ${user.username},</p>
                <p>Your account has been successfully unlocked and your password has been reset.</p>
                <p>You can now log in with your new password.</p>
                <p>If you didn't request this, please contact support immediately.</p>
                <br>
                <p>Best regards,<br>Your App Team</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(httpStatus.OK).json({ 
            message: "Account unlocked successfully. You can now login with your new password.",
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user._id,
                email: user.email,
                username: user.username
            }
        });

    } catch (error) {
        logError(error, { context: 'unlockAccount' });
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ 
            message: error.message || "Error unlocking account" 
        });
    }
};

// Deregister account controller function
const deregisterAccount = async (req, res) => {
    const { password, reason } = req.body;
    const userId = req.userId; // From JWT middleware

    if (!password) {
        return res.status(httpStatus.BAD_REQUEST).json({
            message: "Please provide your password to confirm deregistration"
        });
    }

    try {
        // Find user
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "User not found"
            });
        }

        // Check if already deregistered
        if (user.isDeregistered) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: "Account is already deregistered"
            });
        }

        // Verify password for security
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        
        if (!isPasswordCorrect) {
            await UserActivity.logActivity(user._id, 'DEREGISTER_FAILED', req, { 
                reason: 'Incorrect password',
                success: false 
            });
            logAuth('DEREGISTER_ATTEMPT', user.email, false, { reason: 'Incorrect password' });
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "Incorrect password"
            });
        }

        // Perform soft delete
        user.isDeregistered = true;
        user.deregisteredAt = new Date();
        user.deregistrationReason = reason || 'User requested deregistration';
        
        // Clear sensitive data but keep the record
        user.refreshToken = undefined;
        user.loginOTP = undefined;
        user.loginOTPExpires = undefined;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.verificationToken = undefined;
        user.verificationExpires = undefined;
        user.unlockToken = undefined;
        user.unlockTokenExpires = undefined;
        
        // Anonymize email and username by adding timestamp
        const timestamp = Date.now();
        user.email = `deregistered_${timestamp}@deleted.com`;
        user.username = `deleted_user_${timestamp}`;
        
        await user.save();
        
        // Log deregistration
        await UserActivity.logActivity(user._id, 'ACCOUNT_DEREGISTERED', req, { 
            reason: reason || 'User requested',
            success: true 
        });
        logAuth('ACCOUNT_DEREGISTERED', `deregistered_${timestamp}@deleted.com`, true, { reason });
        logUserActivity(user._id, 'ACCOUNT_DEREGISTERED', { reason });

        // Send confirmation email to original email (before anonymization)
        const originalEmail = req.body.email || user.email; // Get from request or use current
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: originalEmail,
            subject: 'Account Deregistration Confirmation',
            html: `
                <h2>Account Deregistered</h2>
                <p>Your account has been successfully deregistered as per your request.</p>
                <p>All your personal data has been anonymized and you will no longer be able to access this account.</p>
                <p>If you wish to use our services again in the future, you will need to create a new account.</p>
                <p>Thank you for being part of our community.</p>
                <br>
                <p>Best regards,<br>Your App Team</p>
            `
        };

        // Send email but don't wait for it
        transporter.sendMail(mailOptions).catch(err => {
            console.error('Failed to send deregistration email:', err);
        });

        res.status(httpStatus.OK).json({
            success: true,
            message: "Account deregistered successfully. All your data has been anonymized."
        });

    } catch (error) {
        logError(error, { context: 'deregisterAccount', userId });
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Error deregistering account"
        });
    }
};

export {
    login, 
    verifyLoginOTP, 
    register, 
    verifyEmail, 
    changePassword, 
    forgotPassword, 
    resetPassword, 
    deleteAccount,
    deregisterAccount,
    googleCallback,
    logout,
    refreshToken,
    unlockAccount
};