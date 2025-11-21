import express from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import { User } from '../models/users.js';
import { UserActivity } from '../models/userActivity.js';
import { adminConfig } from '../config/adminConfig.js';
import { sessionManager } from '../utils/sessionManager.js';

const router = express.Router();

// Get all users (excluding passwords)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({ isDeregistered: { $ne: true } }).select('-password');

    // Add the file-based admin to the list if requested
    const allUsers = [...users];
    if (req.query.includeSystemAdmin === 'true') {
      allUsers.unshift({
        _id: 'admin-system-user',
        email: adminConfig.email,
        name: adminConfig.name,
        role: 'admin',
        createdAt: new Date('2024-01-01'),
        isSystemAdmin: true
      });
    }

    res.json({
      success: true,
      count: allUsers.length,
      users: allUsers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// Get user sessions/activities
router.get('/sessions', adminAuth, async (req, res) => {
  try {
    console.log('Fetching active sessions from activities...');

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const loginActivities = await UserActivity.find({
      action: { $in: ['LOGIN_SUCCESS', 'OTP_VERIFIED', 'ADMIN_LOGIN_SUCCESS', 'GOOGLE_LOGIN'] },
      timestamp: { $gte: twentyFourHoursAgo }
    })
      .populate('user', 'email username name role')
      .sort('-timestamp')
      .lean();

    console.log('Found login activities:', loginActivities.length);

    // Get all logout and termination activities
    const logoutActivities = await UserActivity.find({
      action: { $in: ['LOGOUT', 'FORCE_LOGOUT', 'ADMIN_SESSION_TERMINATE'] },
      timestamp: { $gte: twentyFourHoursAgo }
    }).select('user timestamp action details').lean();

    // Track terminated sessions
    const terminatedSessionIds = new Set();
    const userTerminationMap = new Map();
    
    logoutActivities.forEach(logout => {
      if (logout.action === 'ADMIN_SESSION_TERMINATE' && logout.details?.sessionId) {
        terminatedSessionIds.add(logout.details.sessionId);
        console.log('Found terminated session:', logout.details.sessionId);
        
        // Also track by user ID and timestamp
        const userId = logout.details.targetUserId || logout.user?.toString();
        if (userId) {
          const existing = userTerminationMap.get(userId) || [];
          existing.push({
            timestamp: logout.timestamp,
            sessionId: logout.details.sessionId
          });
          userTerminationMap.set(userId, existing);
        }
      }
    });

    const userLogoutMap = new Map();
    logoutActivities.forEach(logout => {
      const userId = logout.user?.toString();
      if (userId && logout.action !== 'ADMIN_SESSION_TERMINATE') {
        const existingLogout = userLogoutMap.get(userId);
        if (!existingLogout || logout.timestamp > existingLogout.timestamp) {
          userLogoutMap.set(userId, {
            timestamp: logout.timestamp,
            sessionId: logout.details?.sessionId,
            action: logout.action
          });
        }
      }
    });

    const activeSessions = [];
    const userSessionMap = new Map();

    loginActivities.forEach(activity => {
      if (!activity.user) return;

      const userId = activity.user._id.toString();
      const loginTime = new Date(activity.timestamp);
      const sessionId = `session_${userId}_${loginTime.getTime()}`;

      // Check if this specific session was terminated
      if (terminatedSessionIds.has(sessionId)) {
        console.log('Skipping terminated session:', sessionId);
        return;
      }

      // Check if there's a termination for this exact session
      const userTerminations = userTerminationMap.get(userId) || [];
      const isSessionTerminated = userTerminations.some(term => 
        term.sessionId === sessionId
      );
      
      if (isSessionTerminated) {
        console.log('Skipping specifically terminated session:', sessionId);
        return;
      }

      const logoutInfo = userLogoutMap.get(userId);

      // Skip if user logged out after this login
      if (logoutInfo && logoutInfo.timestamp > loginTime) {
        return;
      }

      const sessionTimeout = 2 * 60 * 60 * 1000; // 2 hours
      if (Date.now() - loginTime.getTime() > sessionTimeout) {
        return;
      }

      const existingSession = userSessionMap.get(userId);
      if (existingSession && existingSession.loginTime > loginTime) {
        return;
      }

      const session = {
        _id: sessionId,
        userId: userId,
        user: {
          _id: activity.user._id,
          email: activity.user.email,
          name: activity.user.name || activity.user.username || 'Unknown',
          username: activity.user.username,
          role: activity.user.role || 'user'
        },
        ipAddress: activity.ipAddress || 'Unknown',
        loginTime: loginTime,
        lastActivity: loginTime,
        status: 'active',
        userAgent: activity.userAgent || 'Unknown',
        createdAt: loginTime
      };

      userSessionMap.set(userId, session);
    });

    activeSessions.push(...userSessionMap.values());

    activeSessions.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

    console.log('Active sessions found:', activeSessions.length);
    console.log('Terminated sessions:', terminatedSessionIds.size);

    // Only update sessionManager with truly active sessions
    sessionManager.clearAllSessions();
    activeSessions.forEach(session => {
      // Double-check the session isn't in terminated list before adding
      if (!terminatedSessionIds.has(session._id)) {
        sessionManager.addSession(session._id, session);
      }
    });

    res.json({
      success: true,
      count: activeSessions.length,
      sessions: activeSessions
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sessions',
      error: error.message
    });
  }
});

// Update user status/override
router.patch('/users/:userId/status', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive, role } = req.body;

    if (userId === 'admin-system-user') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify system admin'
      });
    }

    const updateData = {};
    if (typeof isActive !== 'undefined') updateData.isActive = isActive;
    if (role) updateData.role = role;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await UserActivity.logActivity(req.userId, 'ADMIN_USER_UPDATE', req, {
      targetUserId: userId,
      updates: updateData,
      success: true
    });

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
      error: error.message
    });
  }
});

// Verify user email manually (admin action)
router.post('/users/:userId/verify', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.json({
        success: true,
        message: 'User is already verified'
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    await UserActivity.logActivity(req.userId, 'ADMIN_VERIFIED_USER', req, {
      targetUserId: userId,
      targetEmail: user.email,
      success: true
    });

    res.json({
      success: true,
      message: 'User email verified successfully'
    });
  } catch (error) {
    console.error('Error verifying user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify user'
    });
  }
});

// Delete user (admin only)
router.delete('/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === 'admin-system-user') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete system admin'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isDeregistered = true;
    user.deregisteredAt = new Date();
    user.deregistrationReason = 'Deleted by admin';
    await user.save();

    await UserActivity.logActivity(req.userId, 'ADMIN_USER_DELETE', req, {
      targetUserId: userId,
      targetEmail: user.email,
      success: true
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
});

// Get dashboard statistics
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isDeregistered: { $ne: true } });

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const loginActivities = await UserActivity.find({
      action: { $in: ['LOGIN_SUCCESS', 'OTP_VERIFIED', 'ADMIN_LOGIN_SUCCESS', 'GOOGLE_LOGIN'] },
      timestamp: { $gte: twoHoursAgo }
    }).select('user timestamp').lean();

    const logoutActivities = await UserActivity.find({
      action: { $in: ['LOGOUT', 'FORCE_LOGOUT', 'ADMIN_SESSION_TERMINATE'] },
      timestamp: { $gte: twoHoursAgo }
    }).select('user timestamp').lean();

    const userLogoutMap = new Map();
    logoutActivities.forEach(logout => {
      const userId = logout.user?.toString();
      if (userId) {
        const existingLogout = userLogoutMap.get(userId);
        if (!existingLogout || logout.timestamp > existingLogout) {
          userLogoutMap.set(userId, logout.timestamp);
        }
      }
    });

    const activeUsers = new Set();
    loginActivities.forEach(activity => {
      if (!activity.user) return;

      const userId = activity.user.toString();
      const loginTime = new Date(activity.timestamp);
      const logoutTime = userLogoutMap.get(userId);

      if (logoutTime && logoutTime > loginTime) {
        return;
      }

      activeUsers.add(userId);
    });

    const activeSessions = activeUsers.size;

    const totalOverrides = await User.countDocuments({
      $or: [
        { role: { $ne: 'user' } },
        { isActive: false },
        { permissions: { $exists: true, $ne: [] } }
      ],
      isDeregistered: { $ne: true }
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessionActivities = await UserActivity.find({
      action: { $in: ['LOGIN_SUCCESS', 'LOGOUT'] },
      timestamp: { $gte: thirtyDaysAgo }
    }).sort({ user: 1, timestamp: 1 });

    let totalDuration = 0;
    let sessionCount = 0;
    const userSessions = new Map();

    sessionActivities.forEach(activity => {
      const userId = activity.user?.toString();
      if (!userId) return;

      if (activity.action === 'LOGIN_SUCCESS') {
        userSessions.set(userId, activity.timestamp);
      } else if (activity.action === 'LOGOUT' && userSessions.has(userId)) {
        const loginTime = userSessions.get(userId);
        const duration = activity.timestamp - loginTime;
        if (duration > 0 && duration < 24 * 60 * 60 * 1000) { // Less than 24 hours
          totalDuration += duration;
          sessionCount++;
        }
        userSessions.delete(userId);
      }
    });

    const avgDurationMinutes = sessionCount > 0 ? Math.round(totalDuration / sessionCount / 60000) : 0;
    const avgSessionDuration = avgDurationMinutes > 60
      ? `${Math.floor(avgDurationMinutes / 60)}h ${avgDurationMinutes % 60}m`
      : `${avgDurationMinutes}m`;

    const recentActivityLogs = await UserActivity.find()
      .populate('user', 'email username')
      .sort('-timestamp')
      .limit(10);

    const recentActivity = recentActivityLogs.map(log => ({
      timestamp: log.timestamp,
      description: `${log.user?.email || 'Unknown user'} - ${log.action.replace(/_/g, ' ').toLowerCase()}`
    }));

    res.json({
      success: true,
      totalUsers,
      activeSessions,
      totalOverrides,
      avgSessionDuration,
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
});

// Get user overrides
router.get('/overrides', adminAuth, async (req, res) => {
  try {
    const usersWithOverrides = await User.find({
      $or: [
        { role: { $ne: 'user' } },
        { isActive: false },
        { permissions: { $exists: true, $ne: [] } }
      ],
      isDeregistered: { $ne: true }
    }).select('-password').populate('_id', 'name email');

    const overrides = usersWithOverrides.map(user => {
      let permissions = [];
      if (user.permissions) {
        if (Array.isArray(user.permissions)) {
          permissions = user.permissions;
        } else if (typeof user.permissions === 'object') {
          permissions = Object.keys(user.permissions).filter(key => user.permissions[key]);
        }
      }

      if (user.role === 'admin') {
        permissions = ['admin_access', 'user_management', 'session_management', 'override_management', 'report_access', 'system_settings'];
      } else if (user.role === 'moderator') {
        permissions = ['user_management', 'session_management'];
      }

      return {
        _id: user._id,
        userId: {
          _id: user._id,
          name: user.name || user.username || 'Unknown',
          email: user.email
        },
        permissions: permissions,
        reason: user.role !== 'user' ? `Role: ${user.role}` : user.isActive === false ? 'Account deactivated' : 'Custom permissions',
        expiresAt: null,
        createdAt: user.updatedAt || user.createdAt
      };
    });

    res.json({
      success: true,
      count: overrides.length,
      overrides
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user overrides',
      error: error.message
    });
  }
});

// Create user override
router.post('/overrides', adminAuth, async (req, res) => {
  try {
    const { userId, permissions, reason, expiresAt } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.permissions = permissions || [];

    if (permissions && permissions.includes('admin_access')) {
      user.role = 'admin';
    } else if (permissions && permissions.includes('user_management')) {
      user.role = 'moderator';
    }

    await user.save();

    await UserActivity.logActivity(req.userId, 'ADMIN_OVERRIDE_CREATE', req, {
      targetUserId: userId,
      permissions: permissions,
      reason: reason
    });

    res.json({
      success: true,
      message: 'Override created successfully',
      override: {
        _id: user._id,
        userId: {
          _id: user._id,
          name: user.name || user.username || 'Unknown',
          email: user.email
        },
        permissions: permissions || [],
        reason: reason || 'Admin override',
        expiresAt: expiresAt || null,
        createdAt: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating override',
      error: error.message
    });
  }
});

// Update user override
router.put('/overrides/:overrideId', adminAuth, async (req, res) => {
  try {
    const { overrideId } = req.params;
    const { permissions, reason, expiresAt } = req.body;

    const user = await User.findById(overrideId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.permissions = permissions || [];

    if (permissions && permissions.includes('admin_access')) {
      user.role = 'admin';
    } else if (permissions && permissions.includes('user_management')) {
      user.role = 'moderator';
    } else {
      user.role = 'user';
    }

    await user.save();

    await UserActivity.logActivity(req.userId, 'ADMIN_OVERRIDE_UPDATE', req, {
      targetUserId: overrideId,
      permissions: permissions,
      reason: reason
    });

    res.json({
      success: true,
      message: 'Override updated successfully',
      override: {
        _id: user._id,
        userId: {
          _id: user._id,
          name: user.name || user.username || 'Unknown',
          email: user.email
        },
        permissions: permissions || [],
        reason: reason || 'Admin override',
        expiresAt: expiresAt || null,
        createdAt: user.updatedAt || user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating override',
      error: error.message
    });
  }
});

// Delete user override
router.delete('/overrides/:overrideId', adminAuth, async (req, res) => {
  try {
    const { overrideId } = req.params;

    const user = await User.findById(overrideId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.role = 'user';
    user.isActive = true;
    user.permissions = {};

    await user.save();

    await UserActivity.logActivity(req.userId, 'ADMIN_OVERRIDE_DELETE', req, {
      targetUserId: overrideId
    });

    res.json({
      success: true,
      message: 'Override deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting override',
      error: error.message
    });
  }
});

// Terminate user session
router.delete('/sessions/:sessionId', adminAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log('Terminating session:', sessionId);

    // First remove from session manager
    const sessionRemoved = sessionManager.removeSession(sessionId);
    console.log('Session removed from manager:', sessionRemoved);

    // Parse session ID to get user ID
    const parts = sessionId.split('_');
    if (parts.length < 3 || parts[0] !== 'session') {
      console.error('Invalid session ID format:', sessionId);
      return res.status(400).json({
        success: false,
        message: 'Invalid session ID format'
      });
    }

    const userId = parts[1];

    // Validate user ID format
    if (!userId || userId.length !== 24) {
      console.error('Invalid user ID in session:', userId);
      // Still return success if session was removed from manager
      if (sessionRemoved) {
        return res.json({
          success: true,
          message: 'Session terminated successfully',
          sessionId: sessionId
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID in session'
      });
    }

    try {
      // Log the termination activity
      await UserActivity.create({
        user: userId,
        action: 'ADMIN_SESSION_TERMINATE',
        timestamp: new Date(),
        ipAddress: req.ip || 'Unknown',
        userAgent: req.get('user-agent') || 'Unknown',
        details: {
          targetUserId: userId,
          sessionId: sessionId,
          terminatedBy: req.userId || 'admin'
        }
      });

      // Update user's last logout time
      try {
        await User.findByIdAndUpdate(userId, {
          lastLogout: new Date()
        });
      } catch (updateError) {
        console.error('Error updating user lastLogout:', updateError);
        // Continue even if this fails
      }

      console.log('Session terminated successfully:', sessionId);
      console.log('Active sessions remaining:', sessionManager.getSessionCount());

      // Return success
      res.json({
        success: true,
        message: 'Session terminated successfully',
        sessionId: sessionId,
        remainingSessions: sessionManager.getSessionCount()
      });
    } catch (dbError) {
      console.error('Database error during session termination:', dbError);
      // Still return success if session was removed from manager
      res.json({
        success: true,
        message: 'Session terminated (some logging may have failed)',
        sessionId: sessionId,
        warning: 'Activity logging failed but session was terminated'
      });
    }
  } catch (error) {
    console.error('Error terminating session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to terminate session',
      error: error.message || 'Internal server error'
    });
  }
});

export default router;