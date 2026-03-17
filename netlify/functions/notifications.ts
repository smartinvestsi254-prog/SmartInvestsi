/**
 * Notification Functions for SmartInvestsi
 * Handles email and in-app notifications
 */

import logger from './logger';

interface Notification {
  id: string;
  userId: string;
  type: 'email' | 'in-app';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: any;
}

interface EmailNotification extends Notification {
  type: 'email';
  email: string;
  subject: string;
}

// Mock notification database
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    userId: '2',
    type: 'in-app',
    title: 'Welcome to SmartInvestsi',
    message: 'Thank you for joining our platform. Start building your investment portfolio today!',
    read: false,
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    userId: '2',
    type: 'in-app',
    title: 'Portfolio Update',
    message: 'Your AAPL position has increased by 5.2%',
    read: true,
    createdAt: '2024-01-02T00:00:00Z'
  }
];

/**
 * Get user's notifications
 */
function getUserNotifications(userId: string, unreadOnly: boolean = false): Notification[] {
  let notifications = MOCK_NOTIFICATIONS.filter(n => n.userId === userId);

  if (unreadOnly) {
    notifications = notifications.filter(n => !n.read);
  }

  return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Create in-app notification
 */
function createNotification(userId: string, title: string, message: string, metadata?: any): Notification {
  const notification: Notification = {
    id: Date.now().toString(),
    userId,
    type: 'in-app',
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
    metadata
  };

  MOCK_NOTIFICATIONS.push(notification);

  logger.info('Notification created', { notificationId: notification.id, userId, title });

  return notification;
}

/**
 * Mark notification as read
 */
function markNotificationAsRead(notificationId: string, userId: string): boolean {
  const notification = MOCK_NOTIFICATIONS.find(n => n.id === notificationId && n.userId === userId);

  if (!notification) {
    return false;
  }

  notification.read = true;

  logger.info('Notification marked as read', { notificationId, userId });

  return true;
}

/**
 * Send email notification (mock implementation)
 */
async function sendEmailNotification(email: string, subject: string, message: string): Promise<boolean> {
  // In production, this would integrate with email service like SendGrid, Mailgun, etc.

  logger.info('Email notification sent', { email, subject });

  // Mock successful send
  return true;
}

/**
 * Create and send email notification
 */
async function createEmailNotification(
  userId: string,
  email: string,
  subject: string,
  title: string,
  message: string,
  metadata?: any
): Promise<EmailNotification> {
  const notification: EmailNotification = {
    id: Date.now().toString(),
    userId,
    type: 'email',
    email,
    subject,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
    metadata
  };

  MOCK_NOTIFICATIONS.push(notification);

  // Send email
  const emailSent = await sendEmailNotification(email, subject, message);

  if (emailSent) {
    logger.info('Email notification created and sent', { notificationId: notification.id, userId, email });
  } else {
    logger.error('Failed to send email notification', { notificationId: notification.id, userId, email });
  }

  return notification;
}

/**
 * Get notification statistics
 */
function getNotificationStats(userId: string): { total: number; unread: number; byType: { [type: string]: number } } {
  const userNotifications = MOCK_NOTIFICATIONS.filter(n => n.userId === userId);

  const stats = {
    total: userNotifications.length,
    unread: userNotifications.filter(n => !n.read).length,
    byType: {} as { [type: string]: number }
  };

  userNotifications.forEach(notification => {
    stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
  });

  return stats;
}

/**
 * Delete old notifications (cleanup)
 */
function cleanupOldNotifications(daysOld: number = 30): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const initialCount = MOCK_NOTIFICATIONS.length;
  const filtered = MOCK_NOTIFICATIONS.filter(n => new Date(n.createdAt) > cutoffDate);

  MOCK_NOTIFICATIONS.length = 0;
  MOCK_NOTIFICATIONS.push(...filtered);

  const deletedCount = initialCount - filtered.length;

  if (deletedCount > 0) {
    logger.info('Old notifications cleaned up', { deletedCount, daysOld });
  }

  return deletedCount;
}

// Export for testing
export {
  getUserNotifications,
  createNotification,
  markNotificationAsRead,
  createEmailNotification,
  getNotificationStats,
  cleanupOldNotifications,
  MOCK_NOTIFICATIONS
};