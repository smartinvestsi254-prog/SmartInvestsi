/**
 * Notifications and Alerts API for SmartInvest
 * Handles user notifications, alerts, and communication preferences
 */

import { Handler } from '@netlify/functions';
import logger from './logger';

interface Notification {
  id: string;
  userId: string;
  type: 'payment' | 'trading' | 'security' | 'system' | 'marketing' | 'educational';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
  readAt?: string;
  actionUrl?: string;
  metadata?: any;
  createdAt: string;
  expiresAt?: string;
}

interface AlertRule {
  id: string;
  userId: string;
  name: string;
  type: 'price' | 'volume' | 'portfolio' | 'security' | 'system';
  condition: {
    field: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains' | 'not_contains';
    value: any;
  };
  enabled: boolean;
  lastTriggered?: string;
  createdAt: string;
}

interface NotificationPreferences {
  userId: string;
  email: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
    types: string[];
  };
  push: {
    enabled: boolean;
    types: string[];
  };
  sms: {
    enabled: boolean;
    types: string[];
  };
  inApp: {
    enabled: boolean;
    types: string[];
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  updatedAt: string;
}

interface NotificationTemplate {
  id: string;
  type: string;
  subject: string;
  body: string;
  variables: string[];
  active: boolean;
}

// Mock data - replace with real database
const mockNotifications: Notification[] = [
  {
    id: 'notif_001',
    userId: 'user123',
    type: 'payment',
    title: 'Payment Successful',
    message: 'Your payment of $50.00 has been processed successfully.',
    priority: 'medium',
    read: false,
    actionUrl: '/transactions',
    metadata: { amount: 50.00, transactionId: 'txn_123' },
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: 'notif_002',
    userId: 'user123',
    type: 'security',
    title: 'New Login Detected',
    message: 'A new login was detected from Chrome on Windows.',
    priority: 'high',
    read: true,
    readAt: '2024-01-15T09:00:00Z',
    actionUrl: '/security',
    createdAt: '2024-01-15T08:45:00Z'
  }
];

const mockAlertRules: AlertRule[] = [
  {
    id: 'alert_001',
    userId: 'user123',
    name: 'Bitcoin Price Alert',
    type: 'price',
    condition: {
      field: 'price',
      operator: 'gt',
      value: 50000
    },
    enabled: true,
    createdAt: '2024-01-01T00:00:00Z'
  }
];

const mockPreferences: NotificationPreferences[] = [
  {
    userId: 'user123',
    email: {
      enabled: true,
      frequency: 'immediate',
      types: ['payment', 'security', 'system']
    },
    push: {
      enabled: true,
      types: ['trading', 'security']
    },
    sms: {
      enabled: false,
      types: []
    },
    inApp: {
      enabled: true,
      types: ['all']
    },
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00'
    },
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockTemplates: NotificationTemplate[] = [
  {
    id: 'template_payment_success',
    type: 'payment',
    subject: 'Payment Successful - {{amount}}',
    body: 'Your payment of {{amount}} for {{description}} has been processed successfully.',
    variables: ['amount', 'description', 'transactionId'],
    active: true
  }
];

/**
 * Get user notifications
 */
async function getNotifications(userId: string, options: any = {}): Promise<any> {
  try {
    const { type, read, limit = 50, offset = 0 } = options;

    let notifications = mockNotifications.filter(n => n.userId === userId);

    if (type) {
      notifications = notifications.filter(n => n.type === type);
    }

    if (read !== undefined) {
      notifications = notifications.filter(n => n.read === read);
    }

    // Sort by created date (newest first)
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const paginated = notifications.slice(offset, offset + limit);

    return {
      success: true,
      data: paginated,
      pagination: {
        total: notifications.length,
        limit,
        offset,
        hasMore: offset + limit < notifications.length
      }
    };
  } catch (error) {
    logger.error('Get notifications error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Mark notification as read
 */
async function markAsRead(userId: string, notificationId: string): Promise<any> {
  try {
    const notification = mockNotifications.find(n => n.id === notificationId && n.userId === userId);

    if (!notification) {
      return { success: false, error: 'Notification not found' };
    }

    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date().toISOString();
    }

    return { success: true, data: notification };
  } catch (error) {
    logger.error('Mark as read error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead(userId: string): Promise<any> {
  try {
    const userNotifications = mockNotifications.filter(n => n.userId === userId);

    userNotifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        notification.readAt = new Date().toISOString();
      }
    });

    return { success: true, data: { updated: userNotifications.length } };
  } catch (error) {
    logger.error('Mark all as read error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Delete notification
 */
async function deleteNotification(userId: string, notificationId: string): Promise<any> {
  try {
    const index = mockNotifications.findIndex(n => n.id === notificationId && n.userId === userId);

    if (index === -1) {
      return { success: false, error: 'Notification not found' };
    }

    mockNotifications.splice(index, 1);

    return { success: true, data: { deleted: true } };
  } catch (error) {
    logger.error('Delete notification error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Create notification
 */
async function createNotification(data: any): Promise<any> {
  try {
    const { userId, type, title, message, priority = 'medium', actionUrl, metadata, expiresAt } = data;

    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      title,
      message,
      priority,
      read: false,
      actionUrl,
      metadata,
      createdAt: new Date().toISOString(),
      expiresAt
    };

    mockNotifications.push(notification);

    logger.info('Notification created', { userId, type, notificationId: notification.id });

    return { success: true, data: notification };
  } catch (error) {
    logger.error('Create notification error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get notification preferences
 */
async function getPreferences(userId: string): Promise<any> {
  try {
    let preferences = mockPreferences.find(p => p.userId === userId);

    if (!preferences) {
      // Create default preferences
      preferences = {
        userId,
        email: {
          enabled: true,
          frequency: 'immediate',
          types: ['payment', 'security', 'system']
        },
        push: {
          enabled: true,
          types: ['trading', 'security']
        },
        sms: {
          enabled: false,
          types: []
        },
        inApp: {
          enabled: true,
          types: ['all']
        },
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00'
        },
        updatedAt: new Date().toISOString()
      };
      mockPreferences.push(preferences);
    }

    return { success: true, data: preferences };
  } catch (error) {
    logger.error('Get preferences error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Update notification preferences
 */
async function updatePreferences(userId: string, data: any): Promise<any> {
  try {
    let preferences = mockPreferences.find(p => p.userId === userId);

    if (!preferences) {
      preferences = {
        userId,
        email: { enabled: true, frequency: 'immediate', types: [] },
        push: { enabled: true, types: [] },
        sms: { enabled: false, types: [] },
        inApp: { enabled: true, types: [] },
        quietHours: { enabled: false, start: '22:00', end: '08:00' },
        updatedAt: new Date().toISOString()
      };
      mockPreferences.push(preferences);
    }

    // Update preferences
    Object.assign(preferences, data);
    preferences.updatedAt = new Date().toISOString();

    return { success: true, data: preferences };
  } catch (error) {
    logger.error('Update preferences error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get alert rules
 */
async function getAlertRules(userId: string): Promise<any> {
  try {
    const rules = mockAlertRules.filter(r => r.userId === userId);

    return { success: true, data: rules };
  } catch (error) {
    logger.error('Get alert rules error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Create alert rule
 */
async function createAlertRule(data: any): Promise<any> {
  try {
    const { userId, name, type, condition, enabled = true } = data;

    const rule: AlertRule = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      name,
      type,
      condition,
      enabled,
      createdAt: new Date().toISOString()
    };

    mockAlertRules.push(rule);

    logger.info('Alert rule created', { userId, type, ruleId: rule.id });

    return { success: true, data: rule };
  } catch (error) {
    logger.error('Create alert rule error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Update alert rule
 */
async function updateAlertRule(userId: string, ruleId: string, data: any): Promise<any> {
  try {
    const rule = mockAlertRules.find(r => r.id === ruleId && r.userId === userId);

    if (!rule) {
      return { success: false, error: 'Alert rule not found' };
    }

    Object.assign(rule, data);

    return { success: true, data: rule };
  } catch (error) {
    logger.error('Update alert rule error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Delete alert rule
 */
async function deleteAlertRule(userId: string, ruleId: string): Promise<any> {
  try {
    const index = mockAlertRules.findIndex(r => r.id === ruleId && r.userId === userId);

    if (index === -1) {
      return { success: false, error: 'Alert rule not found' };
    }

    mockAlertRules.splice(index, 1);

    return { success: true, data: { deleted: true } };
  } catch (error) {
    logger.error('Delete alert rule error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Send bulk notifications
 */
async function sendBulkNotifications(data: any): Promise<any> {
  try {
    const { userIds, type, title, message, priority = 'medium', actionUrl, metadata } = data;

    const notifications = userIds.map((userId: string) => ({
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      title,
      message,
      priority,
      read: false,
      actionUrl,
      metadata,
      createdAt: new Date().toISOString()
    }));

    mockNotifications.push(...notifications);

    logger.info('Bulk notifications sent', { count: notifications.length, type });

    return { success: true, data: { sent: notifications.length } };
  } catch (error) {
    logger.error('Send bulk notifications error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get notification statistics
 */
async function getNotificationStats(userId: string): Promise<any> {
  try {
    const userNotifications = mockNotifications.filter(n => n.userId === userId);

    const stats = {
      total: userNotifications.length,
      unread: userNotifications.filter(n => !n.read).length,
      byType: userNotifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byPriority: userNotifications.reduce((acc, n) => {
        acc[n.priority] = (acc[n.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return { success: true, data: stats };
  } catch (error) {
    logger.error('Get notification stats error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Check alert conditions (simulated)
 */
async function checkAlerts(): Promise<any> {
  try {
    // Simulate checking alert conditions
    // In production, this would run periodically or on data changes

    const triggeredAlerts = [];

    for (const rule of mockAlertRules.filter(r => r.enabled)) {
      // Mock condition checking logic
      const triggered = Math.random() > 0.8; // Random trigger for demo

      if (triggered) {
        const notification = await createNotification({
          userId: rule.userId,
          type: 'trading',
          title: `Alert Triggered: ${rule.name}`,
          message: `Your alert condition has been met.`,
          priority: 'high',
          metadata: { ruleId: rule.id, condition: rule.condition }
        });

        rule.lastTriggered = new Date().toISOString();
        triggeredAlerts.push(notification.data);
      }
    }

    return { success: true, data: { triggered: triggeredAlerts.length, alerts: triggeredAlerts } };
  } catch (error) {
    logger.error('Check alerts error', { error: error.message });
    return { success: false, error: error.message };
  }
}

export const handler: Handler = async (event) => {
  const { httpMethod, path, body } = event;

  try {
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(httpMethod)) {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, error: 'Method not allowed' })
      };
    }

    const data = body ? JSON.parse(body) : {};
    const userId = data.userId || 'anonymous';

    let result;

    if (path.includes('/notifications') && httpMethod === 'GET' && !path.includes('/stats') && !path.includes('/read') && !path.includes('/delete')) {
      const type = new URLSearchParams(path.split('?')[1] || '').get('type');
      const read = new URLSearchParams(path.split('?')[1] || '').get('read');
      const limit = parseInt(new URLSearchParams(path.split('?')[1] || '').get('limit') || '50');
      const offset = parseInt(new URLSearchParams(path.split('?')[1] || '').get('offset') || '0');
      result = await getNotifications(userId, { type, read, limit, offset });
    } else if (path.includes('/notifications/read') && httpMethod === 'POST') {
      if (data.notificationId) {
        result = await markAsRead(userId, data.notificationId);
      } else {
        result = await markAllAsRead(userId);
      }
    } else if (path.includes('/notifications/') && path.split('/notifications/')[1] && httpMethod === 'DELETE') {
      const notificationId = path.split('/notifications/')[1].split('/')[0];
      result = await deleteNotification(userId, notificationId);
    } else if (path.includes('/notifications') && httpMethod === 'POST' && !path.includes('/bulk')) {
      result = await createNotification(data);
    } else if (path.includes('/notifications/bulk') && httpMethod === 'POST') {
      result = await sendBulkNotifications(data);
    } else if (path.includes('/notifications/stats')) {
      result = await getNotificationStats(userId);
    } else if (path.includes('/preferences') && httpMethod === 'GET') {
      result = await getPreferences(userId);
    } else if (path.includes('/preferences') && httpMethod === 'PUT') {
      result = await updatePreferences(userId, data);
    } else if (path.includes('/alerts') && httpMethod === 'GET') {
      result = await getAlertRules(userId);
    } else if (path.includes('/alerts') && httpMethod === 'POST') {
      result = await createAlertRule(data);
    } else if (path.includes('/alerts/') && path.split('/alerts/')[1] && httpMethod === 'PUT') {
      const ruleId = path.split('/alerts/')[1].split('/')[0];
      result = await updateAlertRule(userId, ruleId, data);
    } else if (path.includes('/alerts/') && path.split('/alerts/')[1] && httpMethod === 'DELETE') {
      const ruleId = path.split('/alerts/')[1].split('/')[0];
      result = await deleteAlertRule(userId, ruleId);
    } else if (path.includes('/alerts/check') && httpMethod === 'POST') {
      result = await checkAlerts();
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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    logger.error('Notifications API error', { error: error.message });

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};