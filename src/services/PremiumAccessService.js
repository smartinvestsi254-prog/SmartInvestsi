/**
 * SmartInvest: Premium Access Service
 * Manages premium user access and subscriptions
 * @module services/PremiumAccessService
 */

class PremiumAccessService {
  /**
   * Initialize premium access service
   * @param {Object} config - Service configuration
   */
  constructor(config = {}) {
    this.defaultDurationDays = config.defaultDurationDays || 30;
    this.accessData = [];
  }

  /**
   * Grant premium access to a user
   * @param {Object} params - Access parameters
   * @param {string} params.phone - User phone number
   * @param {string} params.email - User email
   * @param {Date|null} params.validUntil - Expiration date (null = unlimited)
   * @param {string} params.reason - Reason for access (payment, promo, etc.)
   * @returns {Promise<{success: boolean, accessId?: string, validUntil?: Date, error?: string}>}
   */
  async grantPremiumAccess(params) {
    const { phone, email, validUntil, reason = 'payment' } = params;

    if (!phone && !email) {
      return { success: false, error: 'Phone or email is required' };
    }

    try {
      const expiresAt = validUntil || new Date(Date.now() + this.defaultDurationDays * 24 * 60 * 60 * 1000);
      
      const accessRecord = {
        id: 'premium-' + Date.now(),
        phone,
        email,
        grantedAt: new Date(),
        expiresAt,
        reason,
        status: 'active'
      };

      this.accessData.push(accessRecord);

      console.log(`✓ Premium access granted to ${phone || email} until ${expiresAt.toISOString()}`);

      return {
        success: true,
        accessId: accessRecord.id,
        validUntil: expiresAt
      };
    } catch (error) {
      console.error('Error granting premium access:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has premium access
   * @param {string} identifier - Phone number or email
   * @returns {Promise<{hasPremium: boolean, expiresAt?: Date, daysRemaining?: number}>}
   */
  async checkPremiumAccess(identifier) {
    try {
      const access = this.accessData.find(a => 
        (a.phone === identifier || a.email === identifier) && a.status === 'active'
      );

      if (!access) {
        return { hasPremium: false };
      }

      const now = new Date();
      if (access.expiresAt && access.expiresAt < now) {
        access.status = 'expired';
        return { hasPremium: false };
      }

      const daysRemaining = access.expiresAt 
        ? Math.ceil((access.expiresAt - now) / (24 * 60 * 60 * 1000))
        : null;

      return {
        hasPremium: true,
        expiresAt: access.expiresAt,
        daysRemaining
      };
    } catch (error) {
      console.error('Error checking premium access:', error);
      return { hasPremium: false, error: error.message };
    }
  }

  /**
   * Revoke premium access
   * @param {string} identifier - Phone number or email
   * @param {string} reason - Revocation reason
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async revokePremiumAccess(identifier, reason = 'manual') {
    try {
      const access = this.accessData.find(a => 
        (a.phone === identifier || a.email === identifier) && a.status === 'active'
      );

      if (!access) {
        return { success: false, error: 'Premium access not found' };
      }

      access.status = 'revoked';
      access.revokedAt = new Date();
      access.revocationReason = reason;

      console.log(`✓ Premium access revoked for ${identifier}: ${reason}`);

      return { success: true };
    } catch (error) {
      console.error('Error revoking premium access:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get access history for a user
   * @param {string} identifier - Phone number or email
   * @returns {Promise<Array>}
   */
  async getAccessHistory(identifier) {
    try {
      const history = this.accessData.filter(a => 
        a.phone === identifier || a.email === identifier
      );

      return history;
    } catch (error) {
      console.error('Error retrieving access history:', error);
      return [];
    }
  }

  /**
   * Clean up expired accesses
   * @returns {Promise<{cleaned: number, error?: string}>}
   */
  async cleanupExpiredAccess() {
    try {
      const now = new Date();
      const beforeCount = this.accessData.length;

      this.accessData = this.accessData.filter(a => {
        if (a.status === 'active' && a.expiresAt && a.expiresAt < now) {
          return false;
        }
        return true;
      });

      const cleaned = beforeCount - this.accessData.length;
      console.log(`✓ Cleaned ${cleaned} expired premium access records`);

      return { cleaned };
    } catch (error) {
      console.error('Error cleaning up expired access:', error);
      return { cleaned: 0, error: error.message };
    }
  }
}

module.exports = PremiumAccessService;
