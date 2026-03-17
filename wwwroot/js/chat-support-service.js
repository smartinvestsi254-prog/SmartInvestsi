/**
 * Chat Support Service for SmartInvest
 * Handles real-time chat support functionality
 */

class ChatSupportService {
  constructor() {
    this.baseUrl = '/.netlify/functions';
    this.wsUrl = 'wss://your-websocket-endpoint'; // Replace with actual WebSocket URL
    this.ws = null;
    this.isConnected = false;
    this.messages = [];
    this.listeners = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.heartbeatDelay = 30000; // 30 seconds
  }

  /**
   * Initialize chat support
   */
  init() {
    this.loadMessagesFromStorage();
    this.connect();
  }

  /**
   * Connect to WebSocket
   */
  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('Chat WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.notifyListeners('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Chat WebSocket disconnected');
        this.isConnected = false;
        this.stopHeartbeat();
        this.notifyListeners('disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Chat WebSocket error:', error);
        this.notifyListeners('error', error);
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.stopHeartbeat();
  }

  /**
   * Attempt to reconnect
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      this.notifyListeners('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.heartbeatDelay);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle incoming message
   */
  handleMessage(data) {
    switch (data.type) {
      case 'message':
        this.addMessage(data.message);
        break;
      case 'typing':
        this.notifyListeners('typing', data.user);
        break;
      case 'pong':
        // Heartbeat response
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  /**
   * Send message
   */
  sendMessage(content, type = 'text') {
    if (!this.isConnected) {
      console.error('Cannot send message: not connected');
      return false;
    }

    const message = {
      id: Date.now().toString(),
      content,
      type,
      timestamp: new Date().toISOString(),
      sender: 'user',
      status: 'sending'
    };

    // Add to local messages immediately
    this.addMessage(message);

    // Send via WebSocket
    try {
      this.ws.send(JSON.stringify({
        type: 'message',
        message: {
          content,
          type
        }
      }));

      // Update status to sent
      message.status = 'sent';
      this.saveMessagesToStorage();
      this.notifyListeners('messageSent', message);

      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      message.status = 'failed';
      this.saveMessagesToStorage();
      this.notifyListeners('messageFailed', message);
      return false;
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping(isTyping = true) {
    if (!this.isConnected) return;

    try {
      this.ws.send(JSON.stringify({
        type: 'typing',
        isTyping
      }));
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }

  /**
   * Add message to chat
   */
  addMessage(message) {
    const newMessage = {
      id: message.id || Date.now().toString(),
      content: message.content,
      type: message.type || 'text',
      timestamp: message.timestamp || new Date().toISOString(),
      sender: message.sender || 'support',
      status: message.status || 'received',
      metadata: message.metadata || {}
    };

    this.messages.push(newMessage);
    this.saveMessagesToStorage();
    this.notifyListeners('newMessage', newMessage);
  }

  /**
   * Get all messages
   */
  getMessages() {
    return [...this.messages];
  }

  /**
   * Clear chat history
   */
  clearHistory() {
    this.messages = [];
    this.saveMessagesToStorage();
    this.notifyListeners('historyCleared');
  }

  /**
   * Get chat history from server
   */
  async getChatHistory(limit = 50) {
    try {
      const response = await fetch(`${this.baseUrl}/chat-support-api/history?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      const data = await response.json();

      if (data.success) {
        this.messages = data.data.map(msg => ({
          id: msg.id,
          content: msg.content,
          type: msg.type,
          timestamp: msg.timestamp,
          sender: msg.sender,
          status: 'received',
          metadata: msg.metadata || {}
        }));

        this.saveMessagesToStorage();
        this.notifyListeners('historyLoaded', this.messages);
        return this.messages;
      } else {
        console.error('Failed to get chat history:', data.error);
        return [];
      }
    } catch (error) {
      console.error('Chat history fetch error:', error);
      return [];
    }
  }

  /**
   * Start new chat session
   */
  async startNewChat() {
    try {
      const response = await fetch(`${this.baseUrl}/chat-support-api/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      const data = await response.json();

      if (data.success) {
        this.clearHistory();
        this.addMessage({
          content: 'Hello! How can I help you with your investment questions today?',
          sender: 'support',
          type: 'text'
        });
        return data.data;
      } else {
        console.error('Failed to start new chat:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Start chat error:', error);
      return null;
    }
  }

  /**
   * End current chat session
   */
  async endChat() {
    try {
      const response = await fetch(`${this.baseUrl}/chat-support-api/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      const data = await response.json();

      if (data.success) {
        this.addMessage({
          content: 'Chat session ended. Thank you for using SmartInvest support!',
          sender: 'system',
          type: 'system'
        });
        this.disconnect();
        return true;
      } else {
        console.error('Failed to end chat:', data.error);
        return false;
      }
    } catch (error) {
      console.error('End chat error:', error);
      return false;
    }
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
   * Notify listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Chat listener error:', error);
      }
    });
  }

  /**
   * Get auth token
   */
  getAuthToken() {
    return localStorage.getItem('auth_token') || '';
  }

  /**
   * Load messages from localStorage
   */
  loadMessagesFromStorage() {
    try {
      const stored = localStorage.getItem('chat_messages');
      if (stored) {
        this.messages = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load chat messages from storage:', error);
    }
  }

  /**
   * Save messages to localStorage
   */
  saveMessagesToStorage() {
    try {
      localStorage.setItem('chat_messages', JSON.stringify(this.messages));
    } catch (error) {
      console.error('Failed to save chat messages to storage:', error);
    }
  }

  /**
   * Format timestamp
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.isConnected;
  }
}

// Create global instance
const chatSupportService = new ChatSupportService();

// Make it globally available
window.ChatSupportService = chatSupportService;