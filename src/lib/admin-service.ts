import { supabase } from './supabase'; // Replace with your initialized Supabase client
import paymentConfig from '../config/payment-services.config';

export interface AdminUser {
  email: string;
  role: 'super_admin' | 'admin' | 'moderator';
  account_id: string;
  permissions: string[];
  created_at: string;
  last_login?: string | null;
  active: boolean;
}

export interface AdminAuditLog {
  id?: string;
  admin_email: string;
  action: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

export interface SystemMetrics {
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
    const adminEmail = paymentConfig.admin.email;

    // Check if admin exists
    const { data: existingAdmin, error: selectError } = await supabase
      .from('admins')
      .select('*')
      .eq('email', adminEmail)
      .maybeSingle();

    if (selectError) throw selectError;

    if (!existingAdmin) {
      // Create new admin account
      const newAdmin = {
        email: adminEmail,
        role: 'super_admin',
        account_id: paymentConfig.admin.accountId,
        permissions: paymentConfig.admin.permissions,
        created_at: new Date().toISOString(),
        last_login: null,
        active: true,
      };

      const { data: insertedAdmin, error: insertError } = await supabase
        .from('admins')
        .insert(newAdmin)
        .select()
        .single();

      if (insertError) throw insertError;

      console.log(`✓ Admin account initialized: ${adminEmail}`);
      return insertedAdmin as AdminUser;
    }

    console.log(`✓ Admin account already exists: ${adminEmail}`);
    return existingAdmin as AdminUser;
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
    const { error } = await supabase
      .from('admins')
      .update({ last_login: new Date().toISOString() })
      .eq('email', email);

    if (error) throw error;

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
    const auditLog = {
      admin_email: adminEmail,
      action,
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('admin_audit_logs')
      .insert(auditLog);

    if (error) throw error;

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
    // Get total user count
    const { count: totalUsers, error: userError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (userError) throw userError;

    // Get payment statistics
    const { data: payments, error: paymentError } = await supabase
      .from('payments')
      .select('amount, provider, status');

    if (paymentError) throw paymentError;

    const totalPayments = payments ? payments.length : 0;
    const totalRevenue = payments
      ? payments.reduce((sum, p) => sum + (p.amount || 0), 0)
      : 0;

    // Extract unique active payment providers (from completed payments)
    const activePaymentMethods = Array.from(
      new Set(
        payments
          ?.filter((p) => p.status === 'completed' && p.provider)
          .map((p) => p.provider as string) || []
      )
    );

    // Determine system health
    const systemHealth =
      (totalUsers || 0) > 0 && totalPayments > 0 && activePaymentMethods.length > 0
        ? 'healthy'
        : 'warning';

    return {
      totalUsers: totalUsers || 0,
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
    const configObj = paymentConfig as unknown as Record<string, any>;
    const methods: string[] = typeof configObj.getEnabledPaymentServices === 'function'
      ? configObj.getEnabledPaymentServices()
      : Object.keys(paymentConfig.payment);

    const methodStatus: Record<string, boolean> = {};

    for (const method of methods) {
      methodStatus[method] = paymentConfig.payment[method as keyof typeof paymentConfig.payment]?.enabled || false;
    }

    // Get user's payments
    const { data: userPayments, error } = await supabase
      .from('payments')
      .select('created_at')
      .eq('email', email)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalTransactions = userPayments ? userPayments.length : 0;
    const lastPayment = totalTransactions > 0
      ? new Date(userPayments[0].created_at)
      : undefined;

    return {
      email,
      verified: true,
      methods: methodStatus,
      lastPayment,
      totalTransactions,
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
    // Get admin info
    const { data: adminDoc } = await supabase
      .from('admins')
      .select('*')
      .eq('email', paymentConfig.admin.email)
      .maybeSingle();

    const admin = adminDoc ? (adminDoc as AdminUser) : null;

    // Get metrics
    const metrics = await getSystemMetrics();

    // Get user email status
    const userStatus = await getEmailPaymentStatus('delijah5415@gmail.com');

    const configObj = paymentConfig as unknown as Record<string, any>;
    const enabledMethods = typeof configObj.getEnabledPaymentServices === 'function'
      ? configObj.getEnabledPaymentServices()
      : [];

    return {
      admin,
      metrics,
      paymentConfig: {
        enabledMethods,
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
    let query = supabase
      .from('admin_audit_logs')
      .select('*');

    if (filter?.email) {
      query = query.eq('admin_email', filter.email);
    }

    if (filter?.action) {
      query = query.eq('action', filter.action);
    }

    if (filter?.dateFrom) {
      query = query.gte('timestamp', filter.dateFrom.toISOString());
    }

    if (filter?.dateTo) {
      query = query.lte('timestamp', filter.dateTo.toISOString());
    }

    const { data: logs, error } = await query
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (logs || []) as AdminAuditLog[];
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
