// SmartInvest Website Receptionist - Prompt-Only Chatbot
// Internal-only, no external APIs, website services focus

class WebsiteReceptionist {
  constructor() {
    this.chatContainer = null;
    this.messages = [];
    this.isOpen = false;
    this.responses = this.getResponses();
    this.init();
  }

  init() {
    this.createChatUI();
    this.addEventListeners();
    this.addWelcomeMessage();
  }

  createChatUI() {
    this.chatContainer = document.createElement('div');
    this.chatContainer.id = 'website-chatbot';
    this.chatContainer.innerHTML = `
      <div id="chat-header">
        <div>SmartInvest Assistant</div>
        <button id="chat-close">×</button>
      </div>
      <div id="chat-messages"></div>
      <div id="chat-input-container">
        <input id="chat-input" type="text" placeholder="Ask about trading, payments, portfolio...">
        <button id="chat-send">Send</button>
      </div>
      <div id="chat-toggle" style="display: none;">💬</div>
    `;
    document.body.appendChild(this.chatContainer);
    
    // Styles (CSP safe)
    const style = document.createElement('style');
    style.textContent = `
      #website-chatbot {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 350px;
        height: 500px;
        background: white;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
      }
      #website-chatbot.open { transform: translateX(0); }
      #chat-toggle { position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; background: #4f46e5; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(79,70,229,0.4); font-size: 20px; z-index: 9999; }
      #chat-header { background: #4f46e5; color: white; padding: 15px; border-radius: 10px 10px 0 0; display: flex; justify-content: space-between; align-items: center; font-weight: 600; }
      #chat-messages { height: 340px; overflow-y: auto; padding: 15px; background: #f8fafc; }
      .message { margin-bottom: 15px; display: flex; }
      .user { justify-content: flex-end; }
      .assistant { justify-content: flex-start; }
      .message-bubble { max-width: 80%; padding: 10px 15px; border-radius: 18px; word-wrap: break-word; }
      .user .message-bubble { background: #4f46e5; color: white; }
      .assistant .message-bubble { background: white; border: 1px solid #e2e8f0; }
      #chat-input-container { display: flex; padding: 15px; border-top: 1px solid #e2e8f0; }
      #chat-input { flex: 1; border: 1px solid #e2e8f0; border-radius: 20px; padding: 10px 15px; outline: none; }
      #chat-send, #chat-close { background: none; border: none; font-size: 18px; cursor: pointer; padding: 0; }
      #chat-send:hover { color: #4f46e5; }
    `;
    document.head.appendChild(style);
  }

  addEventListeners() {
    const toggle = document.getElementById('chat-toggle');
    const close = document.getElementById('chat-close');
    const send = document.getElementById('chat-send');
    const input = document.getElementById('chat-input') as HTMLInputElement;

    toggle?.addEventListener('click', () => this.toggleChat());
    close?.addEventListener('click', () => this.closeChat());
    send?.addEventListener('click', () => this.sendMessage());
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    this.chatContainer?.classList.toggle('open', this.isOpen);
    document.getElementById('chat-toggle')!.style.display = this.isOpen ? 'none' : 'flex';
  }

  closeChat() {
    this.isOpen = false;
    this.chatContainer?.classList.remove('open');
    document.getElementById('chat-toggle')!.style.display = 'flex';
  }

  addWelcomeMessage() {
    this.addMessage('assistant', "Welcome to SmartInvest! I'm your website assistant. Ask me about trading, payments, portfolios, crypto, or check our FAQ. How can I help?");
  }

  addMessage(role: 'user' | 'assistant', content: string) {
    this.messages.push({ role, content });
    const messagesEl = document.getElementById('chat-messages')!;
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;
    messageEl.innerHTML = `<div class="message-bubble">${this.escapeHtml(content)}</div>`;
    messagesEl.appendChild(messageEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async sendMessage() {
    const input = document.getElementById('chat-input') as HTMLInputElement;
    const message = input.value.trim();
    if (!message) return;

    this.addMessage('user', message);
    input.value = '';

    // Website-only prompt responses
    const response = await this.getWebsiteResponse(message);
    this.addMessage('assistant', response);
  }

  getWebsiteResponse(message: string): string {
    const lowerMsg = message.toLowerCase();
    
    // Website services only - prompt responses
    if (lowerMsg.includes('trading') || lowerMsg.includes('trade')) {
      return 'Our trading platform offers stocks, crypto, forex. Check dashboard.html for real-time charts, copy-trading.html for social trading, portfolios.html for management. Need login? Visit login.html.';
    }
    if (lowerMsg.includes('payment') || lowerMsg.includes('pay')) {
      return 'Secure payments via Stripe, PayPal, MPESA. Premium subscriptions at pricing.html. Go to dashboard.html > Payments for history.';
    }
    if (lowerMsg.includes('portfolio')) {
      return 'Manage portfolios at portfolios.html. View analytics, rebalance, alerts at alerts.html. Premium features in enhanced-dashboard.html.';
    }
    if (lowerMsg.includes('crypto')) {
      return 'Crypto trading, payments, wallets. See crypto-trading.html and crypto-payments in dashboard.';
    }
    if (lowerMsg.includes('premium')) {
      return 'Premium: Advanced analytics, priority support, exclusive tools. Subscribe at pricing.html.';
    }
    if (lowerMsg.includes('login') || lowerMsg.includes('signup')) {
      return 'Login: login.html | Signup: signup.html. Forgot password? reset-password.html.';
    }
    if (lowerMsg.includes('banking')) {
      return 'Advanced banking at banking-dashboard.html. P2P transfers, accounts, KYC.';
    }
    if (lowerMsg.includes('faq') || lowerMsg.includes('help')) {
      return 'FAQ: faq.html | Contact: contact.html | Terms: terms.html | Privacy: privacy.html';
    }
    if (lowerMsg.includes('calculator')) {
      return 'Investment calculator: tools/investment_calculator.html | Premium calculators: premium-calculators.html';
    }
    
    return 'SmartInvest website services: Trading (dashboard.html), Payments (pricing.html), Portfolios (portfolios.html), Banking (banking-dashboard.html), FAQ (faq.html). What specifically can I help with?';
  }

  escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new WebsiteReceptionist());
} else {
  new WebsiteReceptionist();
}
