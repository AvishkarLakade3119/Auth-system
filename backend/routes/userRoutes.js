import { Router } from "express"
import { 
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
} from "../controllers/userController.js"
import { authenticateJWT } from "../middleware/auth.js"
import passport from "../config/passport.js"

const router = Router();

// Public routes
router.route("/register").post(register);
router.route("/verify-email").post(verifyEmail);
router.route("/verify-otp").post(verifyLoginOTP);
router.route("/login").post(login);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password").post(resetPassword);
router.route("/refresh-token").post(refreshToken);
router.route("/unlock-account").post(unlockAccount);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed` }),
    googleCallback
);

// Protected routes (require JWT authentication)
router.route("/change-password").post(authenticateJWT, changePassword);
router.route("/delete-account").delete(authenticateJWT, deleteAccount);
router.route("/deregister").post(authenticateJWT, deregisterAccount);
router.route("/logout").post(authenticateJWT, logout);

// Verify token endpoint
router.route("/verify").get(authenticateJWT, (req, res) => {
  // If we reach here, the token is valid (authenticateJWT middleware passed)
  // Handle system admin case
  if (req.userId === 'admin-system-user') {
    res.json({
      success: true,
      user: {
        id: 'admin-system-user',
        email: 'admin@yourdomain.com',
        role: 'admin',
        name: 'System Administrator',
        isSystemAdmin: true
      }
    });
  } else {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role || 'user',
        name: req.user.name || req.user.username
      }
    });
  }
});

export default router;