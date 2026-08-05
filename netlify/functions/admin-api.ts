/**
 * Admin API for SmartInvest
 * Handles admin grants, role management, and premium gating
 */

import { Handler } from '@netlify/functions';
import prisma from './lib/prisma';
import logger from './logger';

interface AdminAction {
  id: string;
  adminId: string;
  action: string;
  targetUserId: string;
  details: any;
  timestamp: string;
}

interface RoleUpdate {
  userId: string;
  oldRole: string;
  newRole: string;
  grantedBy: string;
  reason: string;
  timestamp: string;
}

// No mock data - use Prisma

/**
 * Grant premium access to user
 */
async function grantPremiumAccess(data: any): Promise<any> {
  try {
    const { adminId, targetUserId, reason } = data;

    // Verify admin permissions
    if (!await isAdmin(adminId)) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Update user role to premium
    const updateResult = await updateUserRole(targetUserId, 'premium', adminId, reason);
    if (!updateResult.success) {
      return updateResult;
    }

    // Log admin action
    logger.info('Premium access granted', { adminId, targetUserId, reason });

    return { success: true, data: { action, roleUpdate: updateResult.data } };
  } catch (error) {
    logger.error('Grant premium access error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Grant enterprise access to user
 */
async function grantEnterpriseAccess(data: any): Promise<any> {
  try {
    const { adminId, targetUserId, reason } = data;

    if (!await isAdmin(adminId)) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const updateResult = await updateUserRole(targetUserId, 'enterprise', adminId, reason);
    if (!updateResult.success) {
      return updateResult;
    }

    logger.info('Enterprise access granted', { adminId, targetUserId, reason });

    return { success: true, data: { action, roleUpdate: updateResult.data } };
  } catch (error) {
    logger.error('Grant enterprise access error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Revoke premium/enterprise access
 */
async function revokeAccess(data: any): Promise<any> {
  try {
    const { adminId, targetUserId, reason } = data;

    if (!await isAdmin(adminId)) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const updateResult = await updateUserRole(targetUserId, 'user', adminId, reason);
    if (!updateResult.success) {
      return updateResult;
    }

    logger.info('Access revoked', { adminId, targetUserId, reason });

    return { success: true, data: { action, roleUpdate: updateResult.data } };
  } catch (error) {
    logger.error('Revoke access error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get all users (admin only)
 */
async function getAllUsers(adminId: string): Promise<any> {
  try {
    if (!await isAdmin(adminId)) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, subscriptionTier: true, createdAt: true }
    });

    return { success: true, data: users.map((u: any) => ({...u, plan: u.subscriptionTier })) };
  } catch (error) {
    logger.error('Get all users error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get admin actions log
 */
async function getAdminActions(adminId: string, limit = 50): Promise<any> {
  try {
    if (!await isAdmin(adminId)) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    return { success: true, data: [] };
  } catch (error) {
    logger.error('Get admin actions error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get user role updates
 */
async function getRoleUpdates(adminId: string, userId?: string): Promise<any> {
  try {
    if (!await isAdmin(adminId)) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    return { success: true, data: [] };
  } catch (error) {
    logger.error('Get role updates error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Check premium access for user
 */
async function checkPremiumAccess(userId: string): Promise<any> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const hasAccess = user?.subscriptionTier !== 'FREE';

    return { success: true, data: { hasAccess, plan: hasAccess ? 'premium' : 'free' } };
  } catch (error) {
    logger.error('Check premium access error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Check enterprise access for user
 */
async function checkEnterpriseAccess(userId: string): Promise<any> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const hasAccess = user?.subscriptionTier === 'ENTERPRISE';

    return { success: true, data: { hasAccess, plan: hasAccess ? 'enterprise' : 'premium' } };
  } catch (error) {
    logger.error('Check enterprise access error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Update user role (internal function)
 */
async function updateUserRole(userId: string, newRole: string, grantedBy: string, reason: string): Promise<any> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const oldTier = user?.subscriptionTier || 'FREE';
    const newTier = newRole === 'premium' ? 'PREMIUM' : newRole === 'enterprise' ? 'ENTERPRISE' : 'FREE';

    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: newTier }
    });

    logger.info(`User tier updated`, { userId, oldTier, newTier, grantedBy, reason });

    const roleUpdate = { userId, oldRole: oldTier, newRole: newTier, grantedBy, reason, timestamp: new Date().toISOString() };
    return { success: true, data: roleUpdate };
  } catch (error) {
    logger.error('Update user role error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Check if user is admin (internal function)
 */
async function isAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    return user?.role === 'ADMIN';
  } catch {
    return false;
  }
}

export const handler: Handler = async (event) => {
  const { httpMethod, path, body } = event;

  try {
    if (!['GET', 'POST'].includes(httpMethod)) {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, error: 'Method not allowed' })
      };
    }

    const data = body ? JSON.parse(body) : {};
    const userId = data.adminId || data.userId || 'anonymous';

    let result;

    if (path.includes('/grant-premium')) {
      result = await grantPremiumAccess(data);
    } else if (path.includes('/grant-enterprise')) {
      result = await grantEnterpriseAccess(data);
    } else if (path.includes('/revoke-access')) {
      result = await revokeAccess(data);
    } else if (path.includes('/users')) {
      result = await getAllUsers(userId);
    } else if (path.includes('/actions')) {
      result = await getAdminActions(userId, data.limit);
    } else if (path.includes('/role-updates')) {
      result = await getRoleUpdates(userId, data.userId);
    } else if (path.includes('/check-premium')) {
      result = await checkPremiumAccess(data.userId || userId);
    } else if (path.includes('/check-enterprise')) {
      result = await checkEnterpriseAccess(data.userId || userId);
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, error: 'Endpoint not found' })
      };
    }

    return {
      statusCode: result.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    logger.error('Admin API error', { error: error.message });

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};