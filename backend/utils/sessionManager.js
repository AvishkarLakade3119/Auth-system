// Session Manager for tracking active user sessions
class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  // Add a new session
  addSession(sessionId, sessionData) {
    console.log('Adding session:', sessionId);
    this.sessions.set(sessionId, {
      _id: sessionId,
      ...sessionData,
      createdAt: sessionData.loginTime || new Date(),
      lastActivity: new Date()
    });
    console.log('Total sessions after add:', this.sessions.size);
  }

  // Update session activity
  updateSessionActivity(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);
    }
  }

  // Get a specific session
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  // Get all sessions
  getAllSessions() {
    const sessions = Array.from(this.sessions.values());
    console.log('Getting all sessions:', sessions.length);
    return sessions;
  }

  // Remove a session
  removeSession(sessionId) {
    console.log('Removing session:', sessionId);
    const result = this.sessions.delete(sessionId);
    console.log('Session removed:', result, 'Remaining sessions:', this.sessions.size);
    return result;
  }

  // Get session count
  getSessionCount() {
    return this.sessions.size;
  }

  // Find sessions by user ID
  findSessionsByUserId(userId) {
    const userSessions = [];
    for (const [sessionId, session] of this.sessions) {
      if (session.userId === userId || (session.user && session.user._id === userId)) {
        userSessions.push(session);
      }
    }
    return userSessions;
  }

  // Remove expired sessions (older than specified hours)
  removeExpiredSessions(hoursToExpire = 24) {
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() - hoursToExpire);
    
    const expiredSessions = [];
    for (const [sessionId, session] of this.sessions) {
      if (new Date(session.lastActivity) < expirationTime) {
        this.sessions.delete(sessionId);
        expiredSessions.push(sessionId);
      }
    }
    
    if (expiredSessions.length > 0) {
      console.log('Removed expired sessions:', expiredSessions);
    }
    
    return expiredSessions;
  }

  // Clear all sessions
  clearAllSessions() {
    const count = this.sessions.size;
    this.sessions.clear();
    console.log('Cleared all sessions. Previous count:', count);
  }
}

// Create singleton instance
export const sessionManager = new SessionManager();

// Clean up expired sessions every hour
setInterval(() => {
  sessionManager.removeExpiredSessions(24);
}, 60 * 60 * 1000);