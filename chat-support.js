/**
 * Support Chat System
 * Real-time and persistent support conversations
 */

const fs = require('fs');
const path = require('path');

const CHATS_FILE = path.join(__dirname, 'data', 'chats.json');
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(CHATS_FILE)) {
  fs.writeFileSync(CHATS_FILE, JSON.stringify([], null, 2));
}

class SupportChat {
  constructor(userId, email) {
    this.conversationId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.userId = userId;
    this.email = email;
    this.messages = [];
    this.status = 'open'; // open, in-progress, closed, resolved
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.assignedTo = null;
    this.priority = 'normal'; // low, normal, high, urgent
    this.category = 'general'; // general, billing, technical, account, other
    this.resolution = null;
    this.tags = [];
  }

  addMessage(role, content, attachments = []) {
    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role, // 'user' or 'admin'
      content,
      attachments,
      timestamp: new Date().toISOString(),
      read: false
    };
    this.messages.push(message);
    this.updatedAt = new Date().toISOString();
    return message;
  }

  markRead(messageId) {
    const msg = this.messages.find(m => m.id === messageId);
    if (msg) msg.read = true;
  }

  assignToAdmin(adminEmail) {
    this.assignedTo = adminEmail;
    this.status = 'in-progress';
  }

  close(resolution, note = '') {
    this.status = 'closed';
    this.resolution = {
      closedAt: new Date().toISOString(),
      note,
      resolvedSuccessfully: resolution === 'resolved'
    };
    this.updatedAt = new Date().toISOString();
  }

  setSeverity(level) {
    this.priority = level; // Raise/lower priority
  }

  addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  getMessageCount(role = null) {
    if (!role) return this.messages.length;
    return this.messages.filter(m => m.role === role).length;
  }

  toJSON(includeDetails = false) {
    if (!includeDetails) {
      return {
        conversationId: this.conversationId,
        email: this.email,
        status: this.status,
        category: this.category,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        priority: this.priority,
        messageCount: this.messages.length
      };
    }
    return {
      conversationId: this.conversationId,
      userId: this.userId,
      email: this.email,
      status: this.status,
      category: this.category,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      priority: this.priority,
      assignedTo: this.assignedTo,
      messages: this.messages,
      resolution: this.resolution,
      tags: this.tags
    };
  }
}

class ChatManager {
  constructor() {
    this.chats = this.loadChats();
    this.activeConnections = new Map(); // WebSocket connections for real-time
  }

  loadChats() {
    try {
      const data = fs.readFileSync(CHATS_FILE, 'utf8');
      return JSON.parse(data) || [];
    } catch (e) {
      console.error('Error loading chats:', e.message);
      return [];
    }
  }

  saveChats() {
    try {
      fs.writeFileSync(CHATS_FILE, JSON.stringify(this.chats, null, 2));
    } catch (e) {
      console.error('Error saving chats:', e.message);
    }
  }

  createChat(userId, email, category = 'general') {
    const chat = new SupportChat(userId, email);
    chat.category = category;
    this.chats.push(chat);
    this.saveChats();
    return chat;
  }

  getChat(conversationId) {
    return this.chats.find(c => c.conversationId === conversationId);
  }

  getUserChats(email) {
    return this.chats.filter(c => c.email === email.toLowerCase());
  }

  getOpenChats() {
    return this.chats.filter(c => c.status === 'open' || c.status === 'in-progress');
  }

  addMessage(conversationId, role, content, attachments = []) {
    const chat = this.getChat(conversationId);
    if (!chat) return null;
    const message = chat.addMessage(role, content, attachments);
    this.saveChats();
    this.notifySubscribers(conversationId, message);
    return message;
  }

  assignChat(conversationId, adminEmail) {
    const chat = this.getChat(conversationId);
    if (!chat) return false;
    chat.assignToAdmin(adminEmail);
    this.saveChats();
    return true;
  }

  closeChat(conversationId, resolution, note = '') {
    const chat = this.getChat(conversationId);
    if (!chat) return false;
    chat.close(resolution, note);
    this.saveChats();
    return true;
  }

  searchChats(query) {
    return this.chats.filter(c => {
      const searchText = `${c.email} ${c.category} ${c.resolution?.note || ''} ${c.tags.join(' ')}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });
  }

  getStatistics() {
    return {
      total: this.chats.length,
      open: this.chats.filter(c => c.status === 'open').length,
      inProgress: this.chats.filter(c => c.status === 'in-progress').length,
      closed: this.chats.filter(c => c.status === 'closed').length,
      avgResponseTime: this.calculateAvgResponseTime(),
      totalMessages: this.chats.reduce((sum, c) => sum + c.messages.length, 0),
      unreadMessages: this.chats.reduce((sum, c) => sum + c.messages.filter(m => !m.read).length, 0)
    };
  }

  calculateAvgResponseTime() {
    const responseTimes = [];
    for (const chat of this.chats) {
      let lastUserMsg = null;
      for (const msg of chat.messages) {
        if (msg.role === 'user') {
          lastUserMsg = msg.timestamp;
        } else if (msg.role === 'admin' && lastUserMsg) {
          const time = new Date(msg.timestamp) - new Date(lastUserMsg);
          responseTimes.push(time);
          lastUserMsg = null;
        }
      }
    }
    if (responseTimes.length === 0) return 0;
    return responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  }

  notifySubscribers(conversationId, message) {
    if (this.activeConnections.has(conversationId)) {
      const subscribers = this.activeConnections.get(conversationId);
      subscribers.forEach(socket => {
        try {
          socket.send(JSON.stringify({ type: 'new_message', message }));
        } catch (e) {
          console.error('Error notifying subscriber:', e.message);
        }
      });
    }
  }

  subscribe(conversationId, socket) {
    if (!this.activeConnections.has(conversationId)) {
      this.activeConnections.set(conversationId, []);
    }
    this.activeConnections.get(conversationId).push(socket);
  }

  unsubscribe(conversationId, socket) {
    if (this.activeConnections.has(conversationId)) {
      const sockets = this.activeConnections.get(conversationId);
      const idx = sockets.indexOf(socket);
      if (idx !== -1) sockets.splice(idx, 1);
      if (sockets.length === 0) this.activeConnections.delete(conversationId);
    }
  }
}

module.exports = {
  SupportChat,
  ChatManager
};
