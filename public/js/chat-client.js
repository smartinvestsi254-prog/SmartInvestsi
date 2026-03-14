class ChatClient {
  constructor(options = {}) {
    this.apiBase = options.apiBase || '/api/support';
    this.wsBase = '/ws/chat';
    this.userEmail = options.userEmail || '';
    this.conversationId = null;
    this.ws = null;
    this.init();
  }

  async init() {
    this.loadUserChats();
    this.createWidget();
    this.bindEvents();
  }

  createWidget() {
    const widget = document.createElement('div');
    widget.id = 'chat-widget';
    widget.innerHTML = `
      <div id="chat-toggle" class="chat-toggle">
        💬
        <span id="chat-badge" class="chat-badge" style="display: none;"></span>
      </div>
      <div id="chat-panel" class="chat-panel" style="display: none;">
        <div class="chat-header">
          <span>Support Chat</span>
          <button id="chat-close">&times;</button>
        </div>
        <div id="chat-messages" class="chat-messages"></div>
        <div class="chat-input-container">
          <input id="chat-input" type="text" placeholder="Type your message..." maxlength="1000">
          <button id="chat-send">Send</button>
        </div>
        <div id="chat-status"></div>
      </div>
    `;
    document.body.appendChild(widget);

    const style = document.createElement('style');
    style.textContent = `
      #chat-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .chat-toggle {
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        border-radius: 50%;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(37,99,235,0.4);
        transition: all 0.3s ease;
      }
      .chat-toggle:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(37,99,235,0.5);
      }
      .chat-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ef4444;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .chat-panel {
        width: 350px;
        height: 500px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        display: flex;
        flex-direction: column;
        margin-bottom: 80px;
        animation: slideUp 0.3s ease;
      }
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .chat-header {
        padding: 16px;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        border-radius: 16px 16px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        color: #1e293b;
      }
      #chat-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #64748b;
        padding: 4px;
      }
      .chat-messages {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        max-height: 350px;
      }
      .chat-message {
        margin-bottom: 12px;
        animation: fadeIn 0.2s ease;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
      }
      .chat-message.user {
        text-align: right;
      }
      .chat-message.admin {
        text-align: left;
      }
      .chat-message-bubble {
        display: inline-block;
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.4;
      }
      .chat-message.user .chat-message-bubble {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: white;
        border-bottom-right-radius: 4px;
      }
      .chat-message.admin .chat-message-bubble {
        background: #f1f5f9;
        color: #1e293b;
        border-bottom-left-radius: 4px;
      }
      .chat-message-time {
        font-size: 11px;
        opacity: 0.7;
        margin-top: 4px;
      }
      .chat-input-container {
        padding: 16px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        gap: 8px;
      }
      #chat-input {
        flex: 1;
        border: 1px solid #e2e8f0;
        border-radius: 20px;
        padding: 12px 16px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }
      #chat-input:focus {
        border-color: #2563eb;
      }
      #chat-send {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: white;
        border: none;
        border-radius: 20px;
        padding: 12px 20px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s;
      }
      #chat-send:hover:not(:disabled) {
        transform: translateY(-1px);
      }
      #chat-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      #chat-status {
        padding: 8px 16px;
        font-size: 12px;
        text-align: center;
        color: #64748b;
      }
      .status-typing { color: #3b82f6; }
      .status-offline { color: #6b7280; }
    `;
    document.head.appendChild(style);
  }

  bindEvents() {
    document.getElementById('chat-toggle').onclick = () => this.togglePanel();
    document.getElementById('chat-close').onclick = () => this.togglePanel();
    document.getElementById('chat-send').onclick = () => this.sendMessage();
    document.getElementById('chat-input').onkeypress = (e) => {
      if (e.key === 'Enter') this.sendMessage();
    };
  }

  togglePanel(open = null) {
    const panel = document.getElementById('chat-panel');
    const isOpen = panel.style.display !== 'none';
    panel.style.display = open !== null ? (open ? 'flex' : 'none') : (isOpen ? 'none' : 'flex');
  }

  async loadUserChats() {
    try {
      const res = await fetch(`${this.apiBase}/chat/my-chats`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        const openChats = data.chats.filter(c => ['open', 'in-progress'].includes(c.status));
        const badge = document.getElementById('chat-badge');
        if (openChats.length > 0) {
          badge.textContent = openChats.length.toString();
          badge.style.display = 'flex';
        }
      }
    } catch (e) {
      console.warn('Chat badge load failed:', e);
    }
  }

  async createNewChat(category = 'general') {
    try {
      const res = await fetch(`${this.apiBase}/chat/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        this.conversationId = data.chat.conversationId;
        this.connectWebSocket();
        this.loadChatMessages();
        document.getElementById('chat-status').textContent = 'New chat created. Waiting for support...';
        document.getElementById('chat-status').className = 'status-offline';
      }
    } catch (e) {
      this.showStatus('Failed to create chat', 'error');
    }
  }

  async connectWebSocket() {
    if (this.ws) this.ws.close();
    this.ws = new WebSocket(`${location.origin}${this.wsBase}/${this.conversationId}`);
    this.ws.onopen = () => {
      this.showStatus('Connected', 'online');
    };
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_message') {
        this.appendMessage(data.message);
        if (data.message.role === 'admin') {
          this.playNotificationSound();
        }
      }
    };
    this.ws.onclose = () => {
      this.showStatus('Disconnected. Reconnecting...', 'offline');
      setTimeout(() => this.connectWebSocket(), 3000);
    };
  }

  async loadChatMessages() {
    if (!this.conversationId) return;
    try {
      const res = await fetch(`${this.apiBase}/chat/${this.conversationId}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        const messagesDiv = document.getElementById('chat-messages');
        messagesDiv.innerHTML = '';
        data.chat.messages.forEach(msg => this.appendMessage(msg));
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    } catch (e) {
      this.showStatus('Failed to load messages', 'error');
    }
  }

  appendMessage(message) {
    const messagesDiv = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${message.role}`;
    msgDiv.innerHTML = `
      <div class="chat-message-bubble">${this.escapeHtml(message.content)}</div>
      <div class="chat-message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
    `;
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  async sendMessage() {
    const input = document.getElementById('chat-input');
    const content = input.value.trim();
    if (!content || !this.conversationId) return;

    try {
      input.disabled = true;
      document.getElementById('chat-send').disabled = true;

      const res = await fetch(`${this.apiBase}/chat/${this.conversationId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        credentials: 'include'
      });

      const data = await res.json();
      if (data.success) {
        input.value = '';
        this.loadChatMessages();
      } else {
        this.showStatus(data.error || 'Send failed', 'error');
      }
    } catch (e) {
      this.showStatus('Send failed', 'error');
    } finally {
      input.disabled = false;
      document.getElementById('chat-send').disabled = false;
    }
  }

  showStatus(message, type = '') {
    const status = document.getElementById('chat-status');
    status.textContent = message;
    status.className = `status-${type}`;
    setTimeout(() => {
      if (status.textContent === message) status.textContent = '';
    }, 3000);
  }

  escapeHtml(text) {
    const map = { '&': '&amp;', '<': '<', '>': '>', '"': '"', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  playNotificationSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq6EcWNgYqIbJyRaL7wX3iUhIs3l2fVV');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }
}

let chatClient = null;

function initChat(userEmail = '') {
  if (document.getElementById('chat-widget')) return;
  chatClient = new ChatClient({ userEmail });
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => initChat(), 1000);
});
