/**
 * SmartInvest: User Service
 * Manages user accounts, profiles, and authentication
 * @module services/UserService
 */

const crypto = require('crypto');

class UserService {
  /**
   * Initialize user service
   * @param {Object} config - Service configuration
   */
  constructor(config = {}) {
    this.users = [];
    this.sessions = [];
    this.passwordResetTokens = [];
  }

  /**
   * Hash password
   * @private
   * @param {string} password - Password to hash
   * @returns {string} Hashed password
   */
  hashPassword(password) {
    return crypto.createHash('sha256').update(password + process.env.SALT || 'default-salt').digest('hex');
  }

  /**
   * Create a new user
   * @param {Object} params - User parameters
   * @param {string} params.email - User email
   * @param {string} params.phone - User phone
   * @param {string} params.password - User password
   * @param {string} params.name - User name
   * @returns {Promise<{success: boolean, userId?: string, error?: string}>}
   */
  async createUser(params) {
    const { email, phone, password, name } = params;

    if (!email || !phone || !password) {
      return { success: false, error: 'Email, phone, and password are required' };
    }

    // Check if email already exists
    if (this.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'Email already registered' };
    }

    // Check if phone already exists
    if (this.users.find(u => u.phone === phone)) {
      return { success: false, error: 'Phone already registered' };
    }

    try {
      const userId = 'user-' + Date.now();
      const user = {
        id: userId,
        email,
        phone,
        passwordHash: this.hashPassword(password),
        name: name || email.split('@')[0],
        isPremium: false,
        premiumExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        status: 'active'
      };

      this.users.push(user);

      console.log(`✓ User created: ${email}`);

      return { success: true, userId };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Authenticate user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{success: boolean, userId?: string, sessionId?: string, error?: string}>}
   */
  async authenticateUser(email, password) {
    try {
      const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (user.status !== 'active') {
        return { success: false, error: 'User account is not active' };
      }

      const passwordHash = this.hashPassword(password);
      if (user.passwordHash !== passwordHash) {
        return { success: false, error: 'Invalid password' };
      }

      // Create session
      const sessionId = 'session-' + crypto.randomBytes(16).toString('hex');
      this.sessions.push({
        id: sessionId,
        userId: user.id,
        email: user.email,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      user.lastLogin = new Date();

      console.log(`✓ User authenticated: ${email}`);

      return { success: true, userId: user.id, sessionId };
    } catch (error) {
      console.error('Error authenticating user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updateUserProfile(userId, updates) {
    try {
      const user = this.users.find(u => u.id === userId);

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Update allowed fields
      const allowedFields = ['name', 'phone'];
      allowedFields.forEach(field => {
        if (field in updates && updates[field]) {
          user[field] = updates[field];
        }
      });

      user.updatedAt = new Date();

      console.log(`✓ User profile updated: ${user.email}`);

      return { success: true };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify session
   * @param {string} sessionId - Session ID to verify
   * @returns {Promise<{valid: boolean, userId?: string, email?: string}>}
   */
  async verifySession(sessionId) {
    try {
      const session = this.sessions.find(s => s.id === sessionId);

      if (!session) {
        return { valid: false };
      }

      const now = new Date();
      if (session.expiresAt < now) {
        this.sessions = this.sessions.filter(s => s.id !== sessionId);
        return { valid: false };
      }

      return { valid: true, userId: session.userId, email: session.email };
    } catch (error) {
      console.error('Error verifying session:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Logout user
   * @param {string} sessionId - Session ID to invalidate
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async logoutUser(sessionId) {
    try {
      this.sessions = this.sessions.filter(s => s.id !== sessionId);
      console.log(`✓ User logged out`);
      return { success: true };
    } catch (error) {
      console.error('Error logging out user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<{success: boolean, resetToken?: string, error?: string}>}
   */
  async requestPasswordReset(email) {
    try {
      const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        // Don't reveal if user exists
        return { success: true, message: 'If email exists, reset link sent' };
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      this.passwordResetTokens.push({
        token: resetToken,
        userId: user.id,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour
      });

      console.log(`✓ Password reset token created for ${email}`);

      return { success: true, resetToken };
    } catch (error) {
      console.error('Error requesting password reset:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reset password with token
   * @param {string} resetToken - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<{success: boolean, userId?: string, error?: string}>}
   */
  async resetPassword(resetToken, newPassword) {
    try {
      const tokenRecord = this.passwordResetTokens.find(t => t.token === resetToken);

      if (!tokenRecord) {
        return { success: false, error: 'Invalid reset token' };
      }

      const now = new Date();
      if (tokenRecord.expiresAt < now) {
        this.passwordResetTokens = this.passwordResetTokens.filter(t => t.token !== resetToken);
        return { success: false, error: 'Reset token expired' };
      }

      const user = this.users.find(u => u.id === tokenRecord.userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      user.passwordHash = this.hashPassword(newPassword);
      this.passwordResetTokens = this.passwordResetTokens.filter(t => t.token !== resetToken);

      console.log(`✓ Password reset for user: ${user.email}`);

      return { success: true, userId: user.id };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>}
   */
  async getUserById(userId) {
    try {
      const user = this.users.find(u => u.id === userId);
      if (!user) return null;

      // Return user without password hash
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  /**
   * Clean up expired sessions
   * @returns {Promise<{cleaned: number}>}
   */
  async cleanupExpiredSessions() {
    try {
      const now = new Date();
      const beforeCount = this.sessions.length;

      this.sessions = this.sessions.filter(s => s.expiresAt > now);

      const cleaned = beforeCount - this.sessions.length;
      console.log(`✓ Cleaned ${cleaned} expired sessions`);

      return { cleaned };
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      return { cleaned: 0, error: error.message };
    }
  }
}

module.exports = UserService;
