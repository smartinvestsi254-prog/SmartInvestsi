/**
 * SmartInvest: Notification Service
 * Handles in-app notifications and alerts
 * @module services/NotificationService
 */

class NotificationService {
  /**
   * Initialize notification service
   */
  constructor() {
    this.notifications = [];
    this.subscribers = [];
  }

  /**
   * Send a notification to a user
   * @param {Object} params - Notification parameters
   * @param {string} params.userId - Recipient user ID
   * @param {string} params.title - Notification title
   * @param {string} params.message - Notification message
   * @param {string} params.type - Notification type (info, success, warning, error)
   * @param {Object} params.metadata - Additional data
   * @returns {Promise<{success: boolean, notificationId?: string, error?: string}>}
   */
  async sendNotification(params) {
    const { userId, title, message, type = 'info', metadata = {} } = params;

    if (!userId || !title || !message) {
      return { success: false, error: 'Missing required parameters' };
    }

    try {
      const notification = {
        id: 'notif-' + Date.now(),
        userId,
        title,
        message,
        type,
        metadata,
        createdAt: new Date(),
        read: false
      };

      this.notifications.push(notification);

      // Notify subscribers (for real-time delivery)
      this.broadcastToSubscribers({
        event: 'notification:new',
        notification
      });

      console.log(`✓ Notification sent to user ${userId}: ${title}`);

      return { success: true, notificationId: notification.id };
    } catch (error) {
      console.error('Error sending notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send payment failure alert
   * @param {Object} params - Alert parameters
   * @param {string} params.phone - User phone
   * @param {string} params.reason - Failure reason
   * @param {string} params.retryUrl - Retry link
   * @returns {Promise<{success: boolean, notificationId?: string, error?: string}>}
   */
  async sendPaymentFailureAlert(params) {
    const { phone, reason, retryUrl } = params;

    return this.sendNotification({
      userId: phone,
      title: 'Payment Failed',
      message: `Your payment could not be processed: ${reason}`,
      type: 'error',
      metadata: {
        reason,
        retryUrl,
        category: 'payment'
      }
    });
  }

  /**
   * Send payment success notification
   * @param {Object} params - Notification parameters
   * @param {string} params.phone - User phone
   * @param {number} params.amount - Payment amount
   * @param {string} params.currency - Currency code
   * @returns {Promise<{success: boolean, notificationId?: string, error?: string}>}
   */
  async sendPaymentSuccessNotification(params) {
    const { phone, amount, currency = 'KES' } = params;

    return this.sendNotification({
      userId: phone,
      title: 'Payment Received',
      message: `Payment of ${amount} ${currency} has been confirmed. Your account has been updated.`,
      type: 'success',
      metadata: {
        amount,
        currency,
        category: 'payment'
      }
    });
  }

  /**
   * Get notifications for a user
   * @param {string} userId - User ID to get notifications for
   * @param {Object} options - Query options
   * @param {boolean} options.unreadOnly - Only unread notifications
   * @param {number} options.limit - Max number of notifications to return
   * @returns {Promise<Array>}
   */
  async getUserNotifications(userId, options = {}) {
    try {
      let notifs = this.notifications.filter(n => n.userId === userId);

      if (options.unreadOnly) {
        notifs = notifs.filter(n => !n.read);
      }

      if (options.limit) {
        notifs = notifs.slice(-options.limit);
      }

      return notifs.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error retrieving user notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async markAsRead(notificationId) {
    try {
      const notif = this.notifications.find(n => n.id === notificationId);

      if (!notif) {
        return { success: false, error: 'Notification not found' };
      }

      notif.read = true;
      notif.readAt = new Date();

      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clear old notifications
   * @param {number} daysOld - Delete notifications older than this many days
   * @returns {Promise<{cleaned: number, error?: string}>}
   */
  async clearOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      const beforeCount = this.notifications.length;

      this.notifications = this.notifications.filter(n => n.createdAt > cutoffDate);

      const cleaned = beforeCount - this.notifications.length;
      console.log(`✓ Cleaned ${cleaned} old notifications`);

      return { cleaned };
    } catch (error) {
      console.error('Error cleaning notifications:', error);
      return { cleaned: 0, error: error.message };
    }
  }

  /**
   * Subscribe to real-time notifications (for WebSocket)
   * @param {Function} callback - Function to call when notificationsare sent
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.push(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  /**
   * Broadcast to all subscribers
   * @private
   * @param {Object} data - Data to broadcast
   */
  broadcastToSubscribers(data) {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in notification subscriber:', error);
      }
    });
  }
}

module.exports = NotificationService;
