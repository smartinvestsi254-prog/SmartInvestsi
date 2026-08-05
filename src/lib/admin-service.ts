/**
 * Unified Admin Service
 * Consolidates admin operations, user management, and system monitoring
 * smartinvestsi254@gmail.com - Primary Admin Account
 */

import { connectToDatabase } from './mongodb';
import paymentConfig from '../config/payment-services.config';

interface AdminUser {
  email: string;
  role: 'super_admin' | 'admin' | 'moderator';
  accountId: string;
  permissions: string[];
  createdAt: Date;
  lastLogin?: Date;
  active: boolean;
}

interface AdminAuditLog {
  adminEmail: string;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

interface SystemMetrics {
  totalUsers: number;
  totalPayments: number;
  totalRevenue: number;
  activePaymentMethods: string[];
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastUpdated: Date;
}

/**
 * Initialize admin account (smartinvestsi254@gmail.com)
 */
export async function initializeAdminAccount(): Promise<AdminUser> {
  try {
    const { db } = await connectToDatabase();
    const adminEmail = paymentConfig.admin.email;

    // Check if admin exists
    let adminUser = await db.collection('admins').findOne({ email: adminEmail });

    if (!adminUser) {
      // Create new admin account
      adminUser = {
        email: adminEmail,
        role: 'super_admin',
        accountId: paymentConfig.admin.accountId,
        permissions: paymentConfig.admin.permissions,
        createdAt: new Date(),
        lastLogin: null,
        active: true,
      };

      await db.collection('admins').insertOne(adminUser);
      console.log(`✓ Admin account initialized: ${adminEmail}`);
    } else {
      console.log(`✓ Admin account already exists: ${adminEmail}`);
    }

    return adminUser as AdminUser;
  } catch (error) {
    console.error('✗ Failed to initialize admin account:', error);
    throw error;
  }
}

/**
 * Verify admin credentials
 */
export async function verifyAdminCredentials(email: string, password: string): Promise<boolean> {
  try {
    const adminEmail = paymentConfig.admin.email;
    const adminPassword = paymentConfig.admin.password;

    if (email !== adminEmail) {
      console.warn(`✗ Invalid admin email attempt: ${email}`);
      return false;
    }

    if (password !== adminPassword) {
      console.warn(`✗ Invalid admin password attempt for: ${email}`);
      return false;
    }

    // Log successful login
    await logAdminAction(email, 'admin_login', { success: true });

    return true;
  } catch (error) {
    console.error('✗ Admin verification error:', error);
    return false;
  }
}

/**
 * Update admin last login
 */
export async function updateAdminLastLogin(email: string): Promise<void> {
  try {
    const { db } = await connectToDatabase();

    await db.collection('admins').updateOne(
      { email },
      {
        $set: { lastLogin: new Date() },
      }
    );

    console.log(`✓ Admin last login updated: ${email}`);
  } catch (error) {
    console.error('✗ Failed to update admin last login:', error);
  }
}

/**
 * Log admin action for audit trail
 */
export async function logAdminAction(
  adminEmail: string,
  action: string,
  details: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const { db } = await connectToDatabase();

    const auditLog: AdminAuditLog = {
      adminEmail,
      action,
      details,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    };

    await db.collection('adminAuditLogs').insertOne(auditLog);
    console.log(`✓ Admin action logged: ${action}`);
  } catch (error) {
    console.error('✗ Failed to log admin action:', error);
  }
}

/**
 * Get system metrics and status
 */
export async function getSystemMetrics(): Promise<SystemMetrics> {
  try {
    const { db } = await connectToDatabase();

    // Get user count
    const totalUsers = await db.collection('users').countDocuments();

    // Get payment statistics
    const paymentStats = await db
      .collection('payments')
      .aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            revenue: { $sum: '$amount' },
          },
        },
      ])
      .toArray();

    const totalPayments = paymentStats[0]?.total || 0;
    const totalRevenue = paymentStats[0]?.revenue || 0;

    // Get active payment methods from completed transactions
    const activeMethods = await db
      .collection('payments')
      .aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: '$provider' } },
      ])
      .toArray();

    const activePaymentMethods = activeMethods.map((m) => m._id).filter(Boolean) as string[];

    // Determine system health
    const systemHealth =
      totalUsers > 0 && totalPayments > 0 && activePaymentMethods.length > 0 ? 'healthy' : 'warning';

    return {
      totalUsers,
      totalPayments,
      totalRevenue,
      activePaymentMethods,
      systemHealth,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error('✗ Failed to retrieve system metrics:', error);
    return {
      totalUsers: 0,
      totalPayments: 0,
      totalRevenue: 0,
      activePaymentMethods: [],
      systemHealth: 'critical',
      lastUpdated: new Date(),
    };
  }
}

/**
 * Get payment status for a specific email
 */
export async function getEmailPaymentStatus(email: string): Promise<{
  email: string;
  verified: boolean;
  methods: Record<string, boolean>;
  lastPayment?: Date;
  totalTransactions: number;
}> {
  try {
    const { db } = await connectToDatabase();

    // Check payment methods for this email
    const methods = await paymentConfig.getEnabledPaymentServices ? 
      paymentConfig.getEnabledPaymentServices() : 
      Object.keys(paymentConfig.payment);

    const methodStatus: Record<string, boolean> = {};
    
    for (const method of methods) {
      methodStatus[method] = paymentConfig.payment[method as keyof typeof paymentConfig.payment]?.enabled || false;
    }

    // Get user's payment statistics
    const userPayments = await db.collection('payments').find({ email }).toArray();

    const lastPayment = userPayments.length > 0 
      ? new Date(Math.max(...userPayments.map(p => new Date(p.createdAt).getTime())))
      : undefined;

    return {
      email,
      verified: true,
      methods: methodStatus,
      lastPayment,
      totalTransactions: userPayments.length,
    };
  } catch (error) {
    console.error('✗ Failed to get email payment status:', error);
    return {
      email,
      verified: false,
      methods: {},
      totalTransactions: 0,
    };
  }
}

/**
 * Check if Google Play is enabled for an email
 */
export async function isGooglePlayEnabledForEmail(email: string): Promise<boolean> {
  try {
    const googlePayConfig = paymentConfig.payment.googlePay;

    if (!googlePayConfig.enabled) {
      console.log(`✗ Google Pay is not enabled globally`);
      return false;
    }

    // Check if email matches a configured Google account
    const isConfiguredEmail = email === googlePayConfig.email;

    if (isConfiguredEmail) {
      console.log(`✓ Google Play is enabled for email: ${email}`);
      return true;
    }

    console.log(`✗ Google Play not configured for email: ${email}`);
    return false;
  } catch (error) {
    console.error('✗ Failed to check Google Play status:', error);
    return false;
  }
}

/**
 * Check PayPal status for an email
 */
export async function isPayPalEnabledForEmail(email: string): Promise<boolean> {
  try {
    const paypalConfig = paymentConfig.payment.paypal;

    if (!paypalConfig.enabled) {
      console.log(`✗ PayPal is not enabled globally`);
      return false;
    }

    // Check if email matches the receiver email
    const isConfiguredEmail = email === paypalConfig.receiverEmail;

    if (isConfiguredEmail) {
      console.log(`✓ PayPal is enabled for email: ${email}`);
      return true;
    }

    console.log(`✗ PayPal not configured for email: ${email}`);
    return false;
  } catch (error) {
    console.error('✗ Failed to check PayPal status:', error);
    return false;
  }
}

/**
 * Get comprehensive admin dashboard data
 */
export async function getAdminDashboardData(): Promise<{
  admin: AdminUser | null;
  metrics: SystemMetrics;
  paymentConfig: any;
  userStatus: Record<string, any>;
}> {
  try {
    const { db } = await connectToDatabase();
    
    // Get admin info
    const admin = (await db.collection('admins').findOne({ email: paymentConfig.admin.email })) as AdminUser | null;

    // Get metrics
    const metrics = await getSystemMetrics();

    // Get user email status
    const userStatus = await getEmailPaymentStatus('delijah5415@gmail.com');

    return {
      admin,
      metrics,
      paymentConfig: {
        enabledMethods: paymentConfig.getEnabledPaymentServices?.() || [],
        googlePayEnabled: paymentConfig.payment.googlePay.enabled,
        paypalEnabled: paymentConfig.payment.paypal.enabled,
      },
      userStatus,
    };
  } catch (error) {
    console.error('✗ Failed to get admin dashboard data:', error);
    throw error;
  }
}

/**
 * Get audit logs
 */
export async function getAdminAuditLogs(
  limit: number = 100,
  filter?: { email?: string; action?: string; dateFrom?: Date; dateTo?: Date }
): Promise<AdminAuditLog[]> {
  try {
    const { db } = await connectToDatabase();

    let query: Record<string, any> = {};

    if (filter?.email) {
      query.adminEmail = filter.email;
    }

    if (filter?.action) {
      query.action = filter.action;
    }

    if (filter?.dateFrom || filter?.dateTo) {
      query.timestamp = {};
      if (filter.dateFrom) {
        query.timestamp.$gte = filter.dateFrom;
      }
      if (filter.dateTo) {
        query.timestamp.$lte = filter.dateTo;
      }
    }

    const logs = await db
      .collection('adminAuditLogs')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return logs as AdminAuditLog[];
  } catch (error) {
    console.error('✗ Failed to retrieve audit logs:', error);
    throw error;
  }
}

export default {
  initializeAdminAccount,
  verifyAdminCredentials,
  updateAdminLastLogin,
  logAdminAction,
  getSystemMetrics,
  getEmailPaymentStatus,
  isGooglePlayEnabledForEmail,
  isPayPalEnabledForEmail,
  getAdminDashboardData,
  getAdminAuditLogs,
};
