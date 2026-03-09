/**
 * Security & Chat Integration for server.js
 * Add these imports and middleware to the main server.js file
 */

// At top of server.js, add these imports:
/*
const {
  DataCompartment,
  UserDataProtection,
  AccessRequest,
  SecurityFirewall,
  PrivacyControl,
  SecureCache,
  DataBreachPrevention
} = require('./data-protection');
const {
  ChatManager
} = require('./chat-support');

// Initialize security layers
const firewall = new SecurityFirewall();
const privacyControl = new PrivacyControl();
const cache = new SecureCache();
const breachPrevention = new DataBreachPrevention();
const chatManager = new ChatManager();

// Apply firewall globally
app.use(firewall.middleware());
*/

// ========================================
// CHAT SUPPORT ENDPOINTS
// ========================================

function initChatEndpoints(app, adminAuth, express) {
  // User: Create support chat
  app.post('/api/support/chat/create', express.json(), (req, res) => {
    try {
      const { email, category = 'general' } = req.body;
      if (!email) return res.status(400).json({ error: 'email required' });

      const chat = chatManager.createChat(email, email, category);
      return res.json({ success: true, conversationId: chat.conversationId });
    } catch (e) {
      console.error('create chat error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // User: Get their chat conversations
  app.get('/api/support/chat/my-chats', (req, res) => {
    try {
      const email = req.headers['x-user-email'];
      if (!email) return res.status(401).json({ error: 'email required' });

      const chats = chatManager.getUserChats(email);
      const sanitized = chats.map(c => c.toJSON());
      return res.json({ success: true, chats: sanitized });
    } catch (e) {
      console.error('get user chats error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // User: Get specific chat conversation
  app.get('/api/support/chat/:conversationId', (req, res) => {
    try {
      const { conversationId } = req.params;
      const email = req.headers['x-user-email'];
      if (!email) return res.status(401).json({ error: 'email required' });

      const chat = chatManager.getChat(conversationId);
      if (!chat) return res.status(404).json({ error: 'conversation not found' });
      if (chat.email !== email.toLowerCase()) return res.status(403).json({ error: 'access denied' });

      return res.json({ success: true, chat: chat.toJSON(true) });
    } catch (e) {
      console.error('get chat error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // User: Send message in support chat
  app.post('/api/support/chat/:conversationId/message', express.json(), (req, res) => {
    try {
      const { conversationId } = req.params;
      const { content, attachments = [] } = req.body;
      const email = req.headers['x-user-email'];

      if (!email) return res.status(401).json({ error: 'email required' });
      if (!content) return res.status(400).json({ error: 'content required' });

      const chat = chatManager.getChat(conversationId);
      if (!chat) return res.status(404).json({ error: 'conversation not found' });
      if (chat.email !== email.toLowerCase()) return res.status(403).json({ error: 'access denied' });

      const message = chatManager.addMessage(conversationId, 'user', content, attachments);
      return res.json({ success: true, message });
    } catch (e) {
      console.error('send message error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // Admin: Get all open chats
  app.get('/api/support/admin/chats', adminAuth, (req, res) => {
    try {
      const chats = chatManager.getOpenChats();
      const sanitized = chats.map(c => c.toJSON());
      return res.json({ success: true, chats: sanitized, total: sanitized.length });
    } catch (e) {
      console.error('admin get chats error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // Admin: Assign chat to themselves
  app.post('/api/support/admin/assign/:conversationId', adminAuth, express.json(), (req, res) => {
    try {
      const { conversationId } = req.params;
      const adminEmail = process.env.ADMIN_USER || 'admin';

      const success = chatManager.assignChat(conversationId, adminEmail);
      if (!success) return res.status(404).json({ error: 'conversation not found' });

      return res.json({ success: true });
    } catch (e) {
      console.error('assign chat error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // Admin: Reply to chat
  app.post('/api/support/admin/reply/:conversationId', adminAuth, express.json(), (req, res) => {
    try {
      const { conversationId } = req.params;
      const { content } = req.body;
      if (!content) return res.status(400).json({ error: 'content required' });

      const message = chatManager.addMessage(conversationId, 'admin', content);
      if (!message) return res.status(404).json({ error: 'conversation not found' });

      return res.json({ success: true, message });
    } catch (e) {
      console.error('admin reply error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // Admin: Close chat
  app.post('/api/support/admin/close/:conversationId', adminAuth, express.json(), (req, res) => {
    try {
      const { conversationId } = req.params;
      const { resolution = 'resolved', note = '' } = req.body;

      const success = chatManager.closeChat(conversationId, resolution, note);
      if (!success) return res.status(404).json({ error: 'conversation not found' });

      return res.json({ success: true });
    } catch (e) {
      console.error('close chat error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // Admin: Search chats
  app.get('/api/support/admin/search', adminAuth, (req, res) => {
    try {
      const { q = '' } = req.query;
      if (!q) return res.status(400).json({ error: 'search query required' });

      const results = chatManager.searchChats(q);
      const sanitized = results.map(c => c.toJSON());
      return res.json({ success: true, results: sanitized, total: sanitized.length });
    } catch (e) {
      console.error('search chats error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // Admin: Get chat statistics
  app.get('/api/support/admin/stats', adminAuth, (req, res) => {
    try {
      const stats = chatManager.getStatistics();
      return res.json({ success: true, stats });
    } catch (e) {
      console.error('chat stats error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });
}

// ========================================
// DATA ACCESS REQUEST ENDPOINTS
// ========================================

const accessRequests = []; // In-memory storage, use DB in production

function initAccessRequestEndpoints(app, adminAuth, express) {
  // User: Request access to their data
  app.post('/api/data/request-access', express.json(), (req, res) => {
    try {
      const { email, dataType, reason = '' } = req.body;
      if (!email || !dataType) return res.status(400).json({ error: 'email and dataType required' });

      const request = new AccessRequest(email, `user-${email}`, `access_${dataType}`, reason);
      accessRequests.push(request);

      return res.json({
        success: true,
        requestId: request.id,
        status: 'pending',
        message: 'Request submitted. Admin will review within 24 hours.'
      });
    } catch (e) {
      console.error('request access error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // Admin: Review pending access requests
  app.get('/api/data/admin/access-requests', adminAuth, (req, res) => {
    try {
      const pending = accessRequests.filter(r => r.status === 'pending');
      return res.json({ success: true, requests: pending });
    } catch (e) {
      console.error('get access requests error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // Admin: Approve access request
  app.post('/api/data/admin/approve/:requestId', adminAuth, express.json(), (req, res) => {
    try {
      const { requestId } = req.params;
      const adminEmail = process.env.ADMIN_USER || 'admin';

      const request = accessRequests.find(r => r.id === requestId);
      if (!request) return res.status(404).json({ error: 'request not found' });

      request.approve(adminEmail);
      return res.json({ success: true, message: 'Access approved for 24 hours' });
    } catch (e) {
      console.error('approve access error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // Admin: Deny access request
  app.post('/api/data/admin/deny/:requestId', adminAuth, express.json(), (req, res) => {
    try {
      const { requestId } = req.params;
      const request = accessRequests.find(r => r.id === requestId);
      if (!request) return res.status(404).json({ error: 'request not found' });

      request.deny();
      return res.json({ success: true, message: 'Access request denied' });
    } catch (e) {
      console.error('deny access error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // Admin: Revoke access
  app.post('/api/data/admin/revoke/:requestId', adminAuth, express.json(), (req, res) => {
    try {
      const { requestId } = req.params;
      const adminEmail = process.env.ADMIN_USER || 'admin';

      const request = accessRequests.find(r => r.id === requestId);
      if (!request) return res.status(404).json({ error: 'request not found' });

      request.revoke(adminEmail);
      return res.json({ success: true, message: 'Access revoked' });
    } catch (e) {
      console.error('revoke access error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });
}

// ========================================
// SECURITY & AUDIT ENDPOINTS
// ========================================

function initSecurityEndpoints(app, adminAuth, express) {
  // Admin: Get audit log
  app.get('/api/security/admin/audit-log', adminAuth, (req, res) => {
    try {
      const { limit = 1000 } = req.query;
      const log = breachPrevention.getAuditLog(process.env.ADMIN_USER || 'admin', Number(limit));
      return res.json({ success: true, auditLog: log });
    } catch (e) {
      console.error('audit log error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // Admin: Get breach alerts
  app.get('/api/security/admin/breach-alerts', adminAuth, (req, res) => {
    try {
      const alerts = breachPrevention.getBreachAlerts(process.env.ADMIN_USER || 'admin');
      return res.json({ success: true, alerts });
    } catch (e) {
      console.error('breach alerts error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // Admin: Block/Unblock IP
  app.post('/api/security/admin/block-ip', adminAuth, express.json(), (req, res) => {
    try {
      const { ip, action = 'block', reason = '' } = req.body;
      if (!ip) return res.status(400).json({ error: 'ip required' });

      if (action === 'block') {
        firewall.blockIP(ip, reason);
      } else if (action === 'unblock') {
        firewall.unblockIP(ip);
      }

      return res.json({ success: true, message: `IP ${action}ed` });
    } catch (e) {
      console.error('block ip error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // Admin: Block/Unblock email
  app.post('/api/security/admin/block-email', adminAuth, express.json(), (req, res) => {
    try {
      const { email, action = 'block', reason = '' } = req.body;
      if (!email) return res.status(400).json({ error: 'email required' });

      if (action === 'block') {
        firewall.blockEmail(email, reason);
      } else if (action === 'unblock') {
        firewall.unblockEmail(email);
      }

      return res.json({ success: true, message: `Email ${action}ed` });
    } catch (e) {
      console.error('block email error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // Admin: Get security status
  app.get('/api/security/admin/status', adminAuth, (req, res) => {
    try {
      return res.json({
        success: true,
        status: {
          firewallActive: true,
          trackingDisabled: privacyControl.trackingDisabled,
          cacheSize: cache.cache.size,
          auditLogEntries: breachPrevention.auditLog.length,
          breachAlerts: breachPrevention.breachAlerts.length,
          blockedIPs: firewall.blockedIPs.size,
          blockedEmails: firewall.blockedEmails.size
        }
      });
    } catch (e) {
      console.error('security status error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });
}

// ========================================
// CATALOG PDF METADATA ENDPOINTS
// ========================================

function initCatalogPDFEndpoints(app, adminAuth, express, readFilesMeta, writeFilesMeta) {
  // Admin: Add PDF information to catalog item
  app.post('/api/admin/files/:id/add-pdf-info', adminAuth, express.json(), (req, res) => {
    try {
      const { id } = req.params;
      const { pdfUrl, pdfTitle, pdfDescription, pages = 0 } = req.body;
      if (!pdfUrl) return res.status(400).json({ error: 'pdfUrl required' });

      const files = readFilesMeta();
      const file = files.find(f => f.id === id);
      if (!file) return res.status(404).json({ error: 'file not found' });

      file.pdfInfo = {
        url: pdfUrl,
        title: pdfTitle || file.title,
        description: pdfDescription || '',
        pages,
        addedAt: new Date().toISOString()
      };

      writeFilesMeta(files);
      return res.json({ success: true, file });
    } catch (e) {
      console.error('add pdf info error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // Public: Get catalog with PDF info (for browsing)
  app.get('/api/catalog-with-pdfs', (req, res) => {
    try {
      const files = readFilesMeta()
        .filter(f => f.published)
        .map(f => ({
          id: f.id,
          title: f.title,
          description: f.description,
          price: f.price,
          pdfInfo: f.pdfInfo ? {
            title: f.pdfInfo.title,
            description: f.pdfInfo.description,
            pages: f.pdfInfo.pages
          } : null
        }));
      return res.json({ success: true, files });
    } catch (e) {
      console.error('catalog with pdfs error', e.message);
      return res.status(500).json({ error: e.message });
    }
  });
}

module.exports = {
  initChatEndpoints,
  initAccessRequestEndpoints,
  initSecurityEndpoints,
  initCatalogPDFEndpoints,
  firewall,
  privacyControl,
  cache,
  breachPrevention,
  chatManager
};
