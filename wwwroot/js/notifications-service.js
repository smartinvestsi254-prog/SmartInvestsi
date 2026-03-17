/**
 * Notifications Service for SmartInvest
 * Handles in-app notifications and user communications
 */

class NotificationsService {
  constructor() {
    this.baseUrl = '/.netlify/functions';
    this.notifications = [];
    this.unreadCount = 0;
    this.listeners = new Set();
    this.maxNotifications = 50;
    this.checkInterval = 30000; // 30 seconds
    this.intervalId = null;
  }

  /**
   * Initialize the notifications service
   */
  init() {
    this.loadFromStorage();
    this.startPolling();
    this.showWelcomeNotification();
  }

  /**
   * Start polling for new notifications
   */
  startPolling() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.checkForNewNotifications();
    }, this.checkInterval);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check for new notifications
   */
  async checkForNewNotifications() {
    try {
      const response = await fetch(`${this.baseUrl}/notifications-api/check`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      const data = await response.json();

      if (data.success && data.data.length > 0) {
        data.data.forEach(notification => {
          this.addNotification(notification);
        });
        this.saveToStorage();
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to check notifications:', error);
    }
  }

  /**
   * Get all notifications
   */
  getNotifications() {
    return [...this.notifications];
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications() {
    return this.notifications.filter(n => !n.read);
  }

  /**
   * Get unread count
   */
  getUnreadCount() {
    return this.unreadCount;
  }

  /**
   * Add a new notification
   */
  addNotification(notification) {
    const newNotification = {
      id: notification.id || Date.now().toString(),
      title: notification.title,
      message: notification.message,
      type: notification.type || 'info',
      read: notification.read || false,
      timestamp: notification.timestamp || new Date().toISOString(),
      data: notification.data || {},
      actions: notification.actions || []
    };

    this.notifications.unshift(newNotification);

    if (!newNotification.read) {
      this.unreadCount++;
    }

    // Keep only max notifications
    if (this.notifications.length > this.maxNotifications) {
      const removed = this.notifications.splice(this.maxNotifications);
      this.unreadCount -= removed.filter(n => !n.read).length;
    }

    this.saveToStorage();
    this.notifyListeners();

    // Show toast for new notifications
    if (!newNotification.read) {
      this.showToast(newNotification);
    }
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead() {
    let marked = 0;
    this.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        marked++;
      }
    });

    this.unreadCount = Math.max(0, this.unreadCount - marked);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Remove notification
   */
  removeNotification(notificationId) {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      const notification = this.notifications[index];
      if (!notification.read) {
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
      this.notifications.splice(index, 1);
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications = [];
    this.unreadCount = 0;
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Add event listener
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove event listener
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback({
          notifications: this.notifications,
          unreadCount: this.unreadCount
        });
      } catch (error) {
        console.error('Notification listener error:', error);
      }
    });
  }

  /**
   * Show toast notification
   */
  showToast(notification) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${this.getToastClass(notification.type)}`;
    toast.innerHTML = `
      <div class="flex items-start">
        <div class="flex-1">
          <h4 class="font-semibold text-sm">${notification.title}</h4>
          <p class="text-sm mt-1">${notification.message}</p>
        </div>
        <button class="ml-2 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 5000);
  }

  /**
   * Get toast CSS class based on type
   */
  getToastClass(type) {
    const classes = {
      success: 'bg-green-50 border border-green-200 text-green-800',
      error: 'bg-red-50 border border-red-200 text-red-800',
      warning: 'bg-yellow-50 border border-yellow-200 text-yellow-800',
      info: 'bg-blue-50 border border-blue-200 text-blue-800'
    };
    return classes[type] || classes.info;
  }

  /**
   * Show welcome notification
   */
  showWelcomeNotification() {
    if (!localStorage.getItem('welcome_shown')) {
      this.addNotification({
        title: 'Welcome to SmartInvest!',
        message: 'Your smart investment platform is ready. Start building your portfolio today.',
        type: 'info',
        read: false
      });
      localStorage.setItem('welcome_shown', 'true');
    }
  }

  /**
   * Send notification to server
   */
  async sendNotification(title, message, type = 'info', userId = null) {
    try {
      const response = await fetch(`${this.baseUrl}/notifications-api/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          title,
          message,
          type,
          userId
        })
      });

      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        console.error('Failed to send notification:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Send notification error:', error);
      return null;
    }
  }

  /**
   * Get auth token
   */
  getAuthToken() {
    return localStorage.getItem('auth_token') || '';
  }

  /**
   * Load notifications from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('notifications');
      if (stored) {
        const data = JSON.parse(stored);
        this.notifications = data.notifications || [];
        this.unreadCount = data.unreadCount || 0;
      }
    } catch (error) {
      console.error('Failed to load notifications from storage:', error);
    }
  }

  /**
   * Save notifications to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem('notifications', JSON.stringify({
        notifications: this.notifications,
        unreadCount: this.unreadCount
      }));
    } catch (error) {
      console.error('Failed to save notifications to storage:', error);
    }
  }

  /**
   * Format timestamp
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}

// Create global instance
const notificationsService = new NotificationsService();

// Make it globally available
window.NotificationsService = notificationsService;