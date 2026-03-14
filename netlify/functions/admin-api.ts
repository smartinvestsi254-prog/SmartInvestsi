/**
 * Admin API for SmartInvest
 * Handles admin grants, role management, and premium gating
 */

import { Handler } from '@netlify/functions';
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

// Mock data - replace with real database
const mockAdminActions: AdminAction[] = [];
const mockRoleUpdates: RoleUpdate[] = [];

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
    const action: AdminAction = {
      id: `action_${Date.now()}`,
      adminId,
      action: 'grant_premium',
      targetUserId,
      details: { reason },
      timestamp: new Date().toISOString()
    };

    mockAdminActions.push(action);

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

    const action: AdminAction = {
      id: `action_${Date.now()}`,
      adminId,
      action: 'grant_enterprise',
      targetUserId,
      details: { reason },
      timestamp: new Date().toISOString()
    };

    mockAdminActions.push(action);

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

    const action: AdminAction = {
      id: `action_${Date.now()}`,
      adminId,
      action: 'revoke_access',
      targetUserId,
      details: { reason },
      timestamp: new Date().toISOString()
    };

    mockAdminActions.push(action);

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

    // In production, fetch from database
    const users = [
      {
        id: '1',
        email: 'user1@example.com',
        name: 'User One',
        role: 'user',
        plan: 'free',
        createdAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        email: 'user2@example.com',
        name: 'User Two',
        role: 'premium',
        plan: 'premium',
        createdAt: '2024-01-15T00:00:00Z'
      }
    ];

    return { success: true, data: users };
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

    const actions = mockAdminActions.slice(-limit);

    return { success: true, data: actions };
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

    let updates = mockRoleUpdates;
    if (userId) {
      updates = updates.filter(u => u.userId === userId);
    }

    return { success: true, data: updates };
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
    // In production, check user's subscription status
    const hasAccess = Math.random() > 0.5; // Mock logic

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
    // In production, check user's subscription status
    const hasAccess = Math.random() > 0.3; // Mock logic

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
    // In production, update user in database
    const oldRole = 'user'; // Mock

    const roleUpdate: RoleUpdate = {
      userId,
      oldRole,
      newRole,
      grantedBy,
      reason,
      timestamp: new Date().toISOString()
    };

    mockRoleUpdates.push(roleUpdate);

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
  // In production, check user's role in database
  return userId === 'admin_user_id'; // Mock check
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