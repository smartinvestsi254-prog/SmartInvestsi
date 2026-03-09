/**
 * Data Protection & Security Layer
 * Implements encryption, access controls, audit logging, and privacy-first design
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Data compartment protection
class DataCompartment {
  constructor(compartmentId, dataType = 'sensitive') {
    this.compartmentId = compartmentId;
    this.dataType = dataType;
    this.accessLog = [];
    this.createdAt = new Date().toISOString();
    this.adminOnly = dataType === 'sensitive' || dataType === 'financial';
  }

  logAccess(accessorEmail, accessorRole, action, result = 'success', reason = '') {
    const log = {
      timestamp: new Date().toISOString(),
      accessor: this.sanitizeEmail(accessorEmail),
      role: accessorRole,
      action,
      result,
      reason,
      compartmentId: this.compartmentId
    };
    this.accessLog.push(log);
    // Keep only last 100 logs per compartment
    if (this.accessLog.length > 100) this.accessLog = this.accessLog.slice(-100);
  }

  sanitizeEmail(email) {
    // Return hash of email instead of plaintext in logs
    if (!email) return 'anonymous';
    return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 16);
  }

  requiresApproval() {
    return this.adminOnly;
  }

  canAccess(accessorRole, isAdmin = false) {
    if (isAdmin) return true; // Admin bypass
    if (this.adminOnly && !isAdmin) return false;
    return true;
  }
}

// User Data Protection Wrapper
class UserDataProtection {
  constructor(user) {
    this.user = user;
    this.compartment = new DataCompartment(`user-${user.email}`, 'sensitive');
    this.allowedFields = ['email', 'createdAt', 'isPremium', 'premiumExpiresAt'];
  }

  // Get sanitized data safe to return to user
  getSanitized(requesterEmail) {
    this.compartment.logAccess(requesterEmail, 'user', 'view_sanitized', 'success');
    return {
      email: this.user.email,
      createdAt: this.user.createdAt,
      isPremium: this.user.isPremium,
      premiumExpiresAt: this.user.premiumExpiresAt
    };
  }

  // Get full data only for admin
  getFull(requesterEmail, isAdmin = false) {
    if (!isAdmin) {
      this.compartment.logAccess(requesterEmail, 'user', 'view_full', 'denied');
      return null;
    }
    this.compartment.logAccess(requesterEmail, 'admin', 'view_full', 'success', 'admin_access');
    return this.user;
  }

  // Hide sensitive fields from response
  hideSensitive(data) {
    const sensitiveFields = ['passwordHash', 'resetToken', 'resetTokenExpiry', 'activityLogs'];
    const sanitized = { ...data };
    sensitiveFields.forEach(field => delete sanitized[field]);
    return sanitized;
  }
}

// Access Request System (approval-based)
class AccessRequest {
  constructor(requesterId, compartmentId, action, reason = '') {
    this.id = crypto.randomUUID();
    this.requesterId = requesterId;
    this.compartmentId = compartmentId;
    this.action = action;
    this.reason = reason;
    this.status = 'pending'; // pending, approved, denied, revoked
    this.createdAt = new Date().toISOString();
    this.approvedAt = null;
    this.approvedBy = null;
    this.revokedAt = null;
    this.revokedBy = null;
    this.accessCount = 0;
    this.lastAccessedAt = null;
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
  }

  approve(adminEmail) {
    if (this.status !== 'pending') return false;
    this.status = 'approved';
    this.approvedAt = new Date().toISOString();
    this.approvedBy = adminEmail;
    return true;
  }

  deny() {
    if (this.status !== 'pending') return false;
    this.status = 'denied';
    return true;
  }

  revoke(adminEmail) {
    this.status = 'revoked';
    this.revokedAt = new Date().toISOString();
    this.revokedBy = adminEmail;
  }

  isExpired() {
    return new Date(this.expiresAt) < new Date();
  }

  isApproved() {
    return this.status === 'approved' && !this.isExpired();
  }

  recordAccess() {
    if (!this.isApproved()) return false;
    this.accessCount++;
    this.lastAccessedAt = new Date().toISOString();
    return true;
  }
}

// Firewall & Rate Limiting
class SecurityFirewall {
  constructor() {
    this.ipLimits = new Map(); // IP -> { count, resetTime }
    this.userLimits = new Map(); // email -> { count, resetTime }
    this.blockedIPs = new Set();
    this.blockedEmails = new Set();
    this.maxRequests = 100; // per minute
    this.maxUserRequests = 50; // per minute per user
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
  }

  blockIP(ip, reason = 'security_violation') {
    this.blockedIPs.add(ip);
    console.log(`[FIREWALL] Blocked IP: ${ip} - Reason: ${reason}`);
  }

  blockEmail(email, reason = 'security_violation') {
    this.blockedEmails.add(email);
    console.log(`[FIREWALL] Blocked Email: ${email} - Reason: ${reason}`);
  }

  unblockIP(ip) {
    this.blockedIPs.delete(ip);
  }

  unblockEmail(email) {
    this.blockedEmails.delete(email);
  }

  checkIP(ip) {
    if (this.blockedIPs.has(ip)) return false;

    const now = Date.now();
    if (!this.ipLimits.has(ip)) {
      this.ipLimits.set(ip, { count: 1, resetTime: now + 60000 });
      return true;
    }

    const limit = this.ipLimits.get(ip);
    if (now > limit.resetTime) {
      this.ipLimits.set(ip, { count: 1, resetTime: now + 60000 });
      return true;
    }

    limit.count++;
    if (limit.count > this.maxRequests) {
      this.blockIP(ip, 'rate_limit_exceeded');
      return false;
    }
    return true;
  }

  checkUser(email) {
    if (this.blockedEmails.has(email)) return false;

    const now = Date.now();
    if (!this.userLimits.has(email)) {
      this.userLimits.set(email, { count: 1, resetTime: now + 60000 });
      return true;
    }

    const limit = this.userLimits.get(email);
    if (now > limit.resetTime) {
      this.userLimits.set(email, { count: 1, resetTime: now + 60000 });
      return true;
    }

    limit.count++;
    if (limit.count > this.maxUserRequests) {
      this.blockEmail(email, 'rate_limit_exceeded');
      return false;
    }
    return true;
  }

  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const email = req.headers['x-user-email'] || '';

      if (!this.checkIP(ip)) {
        return res.status(429).json({ error: 'IP rate limit exceeded' });
      }

      if (email && !this.checkUser(email)) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }

      next();
    };
  }
}

// Privacy & Tracking Control
class PrivacyControl {
  constructor() {
    this.trackingDisabled = true;
    this.sensitiveFields = [
      'passwordHash', 'resetToken', 'resetTokenExpiry',
      'phone', 'accountNumber', 'creditCard',
      'encryptionKey', 'apiKey', 'secret'
    ];
    this.noTrackPatterns = ['/api/auth', '/api/download', '/api/payment'];
  }

  shouldTrack(pathname) {
    if (this.trackingDisabled) return false;
    return !this.noTrackPatterns.some(pattern => pathname.includes(pattern));
  }

  stripSensitiveFields(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const cleaned = { ...obj };
    this.sensitiveFields.forEach(field => {
      if (field in cleaned) {
        cleaned[field] = '[REDACTED]';
      }
    });
    return cleaned;
  }

  sanitizeResponse(data) {
    if (Array.isArray(data)) {
      return data.map(item => this.stripSensitiveFields(item));
    }
    return this.stripSensitiveFields(data);
  }
}

// Cache with TTL and Security
class SecureCache {
  constructor() {
    this.cache = new Map();
    this.ttls = new Map();
    this.accessControl = new Map(); // cacheKey -> roles allowed
    this.maxSize = 1000; // Max cache entries
  }

  set(key, value, ttl = 5 * 60 * 1000, allowedRoles = ['admin']) {
    // Limit cache size
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.ttls.delete(firstKey);
      this.accessControl.delete(firstKey);
    }

    this.cache.set(key, value);
    this.ttls.set(key, Date.now() + ttl);
    this.accessControl.set(key, allowedRoles);
  }

  get(key, userRole = 'user') {
    this.cleanup(); // Remove expired entries
    if (!this.cache.has(key)) return null;

    // Check access control
    const allowed = this.accessControl.get(key) || [];
    if (!allowed.includes(userRole) && !allowed.includes('*')) {
      return null; // Access denied
    }

    return this.cache.get(key);
  }

  invalidate(key) {
    this.cache.delete(key);
    this.ttls.delete(key);
    this.accessControl.delete(key);
  }

  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.invalidate(key);
      }
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, expiry] of this.ttls.entries()) {
      if (now > expiry) {
        this.invalidate(key);
      }
    }
  }
}

// Data Breach Prevention & Audit
class DataBreachPrevention {
  constructor() {
    this.auditLog = [];
    this.suspiciousActivities = [];
    this.breachAlerts = [];
    this.maxAuditEntries = 10000;
  }

  logAccess(email, action, resource, ip, result = 'success') {
    const entry = {
      timestamp: new Date().toISOString(),
      email: this.hashEmail(email),
      action,
      resource,
      ip: this.anonymizeIP(ip),
      result
    };
    this.auditLog.push(entry);
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog.shift();
    }
  }

  detectAnomalies(email, ip, action) {
    // Check for suspicious patterns
    const recentActions = this.auditLog.filter(
      log => log.email === this.hashEmail(email) &&
      new Date(log.timestamp) > new Date(Date.now() - 5 * 60 * 1000)
    );

    // Alert on unusual activity (e.g., multiple failed login attempts)
    if (action === 'failed_login' && recentActions.length > 5) {
      this.alertBreach(`Multiple failed logins for ${email}`, email, 'high');
      return true;
    }

    return false;
  }

  alertBreach(message, email, severity = 'medium') {
    const alert = {
      timestamp: new Date().toISOString(),
      message,
      email: this.hashEmail(email),
      severity
    };
    this.breachAlerts.push(alert);
    console.error(`[BREACH ALERT] ${severity.toUpperCase()}: ${message}`);
  }

  hashEmail(email) {
    return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 16);
  }

  anonymizeIP(ip) {
    if (!ip) return 'unknown';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
    }
    return 'anonymized';
  }

  getAuditLog(adminEmail, limit = 1000) {
    return this.auditLog.slice(-limit);
  }

  getBreachAlerts(adminEmail) {
    return this.breachAlerts;
  }
}

module.exports = {
  DataCompartment,
  UserDataProtection,
  AccessRequest,
  SecurityFirewall,
  PrivacyControl,
  SecureCache,
  DataBreachPrevention
};
