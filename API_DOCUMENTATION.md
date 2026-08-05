# SmartInvest Security & Chat API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
**Admin endpoints** require Basic Authentication:
```
Authorization: Basic base64(admin:password)
```

**User endpoints** require email header:
```
x-user-email: user@example.com
```

---

## 1. Chat Support System

### Create Support Chat
**Endpoint:** `POST /api/support/chat/create`

**Request:**
```json
{
  "email": "user@example.com",
  "category": "billing|technical|general"
}
```

**Response:** (201 Created)
```json
{
  "success": true,
  "conversationId": "chat_1234567890",
  "message": "Support conversation created"
}
```

---

### Get User's Chats
**Endpoint:** `GET /api/support/chat/my-chats`

**Headers:**
```
x-user-email: user@example.com
```

**Response:** (200 OK)
```json
{
  "success": true,
  "chats": [
    {
      "conversationId": "chat_123",
      "email": "user@example.com",
      "category": "billing",
      "status": "open",
      "priority": "normal",
      "messages": [
        {
          "id": "msg_123",
          "sender": "user",
          "content": "I need help",
          "timestamp": "2024-01-15T10:30:00Z",
          "read": true
        }
      ],
      "createdAt": "2024-01-15T10:25:00Z"
    }
  ]
}
```

---

### Get Specific Chat
**Endpoint:** `GET /api/support/chat/:conversationId`

**Headers:**
```
x-user-email: user@example.com
```

**Response:** (200 OK)
```json
{
  "success": true,
  "chat": {
    "conversationId": "chat_123",
    "email": "user@example.com",
    "category": "billing",
    "status": "open",
    "priority": "normal",
    "messages": [/* ... */],
    "createdAt": "2024-01-15T10:25:00Z",
    "updatedAt": "2024-01-15T10:45:00Z"
  }
}
```

**Error:** (404 Not Found)
```json
{
  "error": "conversation not found"
}
```

---

### Send Message in Chat
**Endpoint:** `POST /api/support/chat/:conversationId/message`

**Headers:**
```
x-user-email: user@example.com
Content-Type: application/json
```

**Request:**
```json
{
  "content": "Can you help me with my payment?",
  "attachments": [
    {
      "name": "receipt.pdf",
      "url": "https://example.com/receipt.pdf"
    }
  ]
}
```

**Response:** (200 OK)
```json
{
  "success": true,
  "message": {
    "id": "msg_456",
    "sender": "user",
    "content": "Can you help me with my payment?",
    "timestamp": "2024-01-15T10:35:00Z",
    "read": false,
    "attachments": [/* ... */]
  }
}
```

---

### Admin: Get All Open Chats
**Endpoint:** `GET /api/support/admin/chats`

**Headers:**
```
Authorization: Basic base64(admin:password)
```

**Response:** (200 OK)
```json
{
  "success": true,
  "chats": [
    {
      "conversationId": "chat_123",
      "email": "user@example.com",
      "category": "billing",
      "status": "open",
      "priority": "normal",
      "assignedTo": null,
      "unreadCount": 2,
      "createdAt": "2024-01-15T10:25:00Z"
    }
  ],
  "total": 1
}
```

---

### Admin: Assign Chat to Self
**Endpoint:** `POST /api/support/admin/assign/:conversationId`

**Headers:**
```
Authorization: Basic base64(admin:password)
```

**Response:** (200 OK)
```json
{
  "success": true,
  "message": "Chat assigned to admin"
}
```

---

### Admin: Reply to Chat
**Endpoint:** `POST /api/support/admin/reply/:conversationId`

**Headers:**
```
Authorization: Basic base64(admin:password)
Content-Type: application/json
```

**Request:**
```json
{
  "content": "Thank you for contacting support. Your payment has been processed."
}
```

**Response:** (200 OK)
```json
{
  "success": true,
  "message": {
    "id": "msg_789",
    "sender": "admin",
    "content": "Thank you for contacting support...",
    "timestamp": "2024-01-15T10:40:00Z"
  }
}
```

---

### Admin: Close Chat
**Endpoint:** `POST /api/support/admin/close/:conversationId`

**Headers:**
```
Authorization: Basic base64(admin:password)
Content-Type: application/json
```

**Request:**
```json
{
  "resolution": "resolved",
  "note": "Issue resolved. Payment confirmed."
}
```

**Response:** (200 OK)
```json
{
  "success": true,
  "message": "Chat closed"
}
```

---

### Admin: Search Chats
**Endpoint:** `GET /api/support/admin/search?q=search_term`

**Headers:**
```
Authorization: Basic base64(admin:password)
```

**Query Parameters:**
- `q` (required): Search term (email, content, category)

**Response:** (200 OK)
```json
{
  "success": true,
  "results": [
    {
      "conversationId": "chat_123",
      "email": "user@example.com",
      "category": "billing",
      "status": "open"
    }
  ],
  "total": 1
}
```

---

### Admin: Get Chat Statistics
**Endpoint:** `GET /api/support/admin/stats`

**Headers:**
```
Authorization: Basic base64(admin:password)
```

**Response:** (200 OK)
```json
{
  "success": true,
  "stats": {
    "totalChats": 42,
    "openChats": 5,
    "closedChats": 37,
    "averageResponseTime": "2h 15m",
    "resolutionRate": 88,
    "categoriesBreakdown": {
      "billing": 15,
      "technical": 20,
      "general": 7
    },
    "unassignedChats": 3
  }
}
```

---

## 2. Data Access Request System

### User: Request Data Access
**Endpoint:** `POST /api/data/request-access`

**Request:**
```json
{
  "email": "user@example.com",
  "dataType": "payment_history|transaction_details|account_info",
  "reason": "Need to verify my recent transactions for accounting purposes"
}
```

**Response:** (200 OK)
```json
{
  "success": true,
  "requestId": "req_9876543210",
  "status": "pending",
  "message": "Request submitted. Admin will review within 24 hours."
}
```

---

### Admin: Get Pending Requests
**Endpoint:** `GET /api/data/admin/access-requests`

**Headers:**
```
Authorization: Basic base64(admin:password)
```

**Response:** (200 OK)
```json
{
  "success": true,
  "requests": [
    {
      "id": "req_123",
      "email": "user@example.com",
      "dataType": "payment_history",
      "reason": "Need to verify my recent transactions",
      "status": "pending",
      "createdAt": "2024-01-15T09:00:00Z",
      "expiresAt": "2024-01-16T09:00:00Z"
    }
  ]
}
```

---

### Admin: Approve Request
**Endpoint:** `POST /api/data/admin/approve/:requestId`

**Headers:**
```
Authorization: Basic base64(admin:password)
Content-Type: application/json
```

**Response:** (200 OK)
```json
{
  "success": true,
  "message": "Access approved for 24 hours",
  "expiresAt": "2024-01-16T09:30:00Z"
}
```

---

### Admin: Deny Request
**Endpoint:** `POST /api/data/admin/deny/:requestId`

**Headers:**
```
Authorization: Basic base64(admin:password)
```

**Response:** (200 OK)
```json
{
  "success": true,
  "message": "Access request denied"
}
```

---

### Admin: Revoke Access
**Endpoint:** `POST /api/data/admin/revoke/:requestId`

**Headers:**
```
Authorization: Basic base64(admin:password)
```

**Response:** (200 OK)
```json
{
  "success": true,
  "message": "Access revoked"
}
```

---

## 3. Security & Firewall

### Admin: Get Audit Log
**Endpoint:** `GET /api/security/admin/audit-log?limit=100`

**Headers:**
```
Authorization: Basic base64(admin:password)
```

**Query Parameters:**
- `limit` (optional): Number of log entries to return (default: 1000)

**Response:** (200 OK)
```json
{
  "success": true,
  "auditLog": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "userId": "user_123",
      "email": "hash:3d2c1f...",
      "action": "login",
      "ip": "192.168.0.0",
      "details": "Successful login attempt"
    },
    {
      "timestamp": "2024-01-15T10:35:00Z",
      "action": "data_access",
      "resource": "payment_history",
      "status": "approved"
    }
  ]
}
```

---

### Admin: Get Breach Alerts
**Endpoint:** `GET /api/security/admin/breach-alerts`

**Headers:**
```
Authorization: Basic base64(admin:password)
```

**Response:** (200 OK)
```json
{
  "success": true,
  "alerts": [
    {
      "timestamp": "2024-01-15T09:45:00Z",
      "type": "anomaly",
      "severity": "high",
      "description": "Unusual number of failed login attempts",
      "email": "hash:abc123...",
      "ip": "192.168.x.x",
      "count": 5,
      "timeWindow": "10 minutes"
    }
  ]
}
```

---

### Admin: Block/Unblock IP
**Endpoint:** `POST /api/security/admin/block-ip`

**Headers:**
```
Authorization: Basic base64(admin:password)
Content-Type: application/json
```

**Request:**
```json
{
  "ip": "192.168.1.100",
  "action": "block",
  "reason": "Multiple failed login attempts"
}
```

**Response:** (200 OK)
```json
{
  "success": true,
  "message": "IP blocked"
}
```

**Unblock Request:**
```json
{
  "ip": "192.168.1.100",
  "action": "unblock"
}
```

---

### Admin: Block/Unblock Email
**Endpoint:** `POST /api/security/admin/block-email`

**Headers:**
```
Authorization: Basic base64(admin:password)
Content-Type: application/json
```

**Request:**
```json
{
  "email": "attacker@example.com",
  "action": "block",
  "reason": "Malicious activity detected"
}
```

**Response:** (200 OK)
```json
{
  "success": true,
  "message": "Email blocked"
}
```

---

### Admin: Get Security Status
**Endpoint:** `GET /api/security/admin/status`

**Headers:**
```
Authorization: Basic base64(admin:password)
```

**Response:** (200 OK)
```json
{
  "success": true,
  "status": {
    "firewallActive": true,
    "trackingDisabled": true,
    "cacheSize": 24,
    "auditLogEntries": 1542,
    "breachAlerts": 3,
    "blockedIPs": 7,
    "blockedEmails": 2
  }
}
```

---

## 4. Catalog with PDF Info

### Get Catalog with PDFs
**Endpoint:** `GET /api/catalog-with-pdfs`

**Response:** (200 OK)
```json
{
  "success": true,
  "files": [
    {
      "id": "file_123",
      "title": "Complete Investment Guide",
      "description": "Learn the fundamentals of investing",
      "price": 5000,
      "pdfInfo": {
        "title": "Investment Guide 2024",
        "description": "Comprehensive 42-page guide covering stocks, bonds, crypto, and portfolio management",
        "pages": 42
      }
    },
    {
      "id": "file_124",
      "title": "Forex Trading Basics",
      "description": "Introduction to forex trading",
      "price": 3000,
      "pdfInfo": null
    }
  ]
}
```

---

### Admin: Add PDF Info to Catalog Item
**Endpoint:** `POST /api/admin/files/:id/add-pdf-info`

**Headers:**
```
Authorization: Basic base64(admin:password)
Content-Type: application/json
```

**Request:**
```json
{
  "pdfUrl": "https://cdn.example.com/guides/investment-2024.pdf",
  "pdfTitle": "Investment Guide 2024 Edition",
  "pdfDescription": "Comprehensive guide covering stocks, bonds, crypto, and portfolio management",
  "pages": 42
}
```

**Response:** (200 OK)
```json
{
  "success": true,
  "file": {
    "id": "file_123",
    "title": "Complete Investment Guide",
    "price": 5000,
    "pdfInfo": {
      "url": "https://cdn.example.com/guides/investment-2024.pdf",
      "title": "Investment Guide 2024 Edition",
      "description": "Comprehensive guide covering stocks, bonds, crypto...",
      "pages": 42,
      "addedAt": "2024-01-15T11:00:00Z"
    }
  }
}
```

---

## 5. Health & Status

### Health Check
**Endpoint:** `GET /api/health`

**Response:** (200 OK)
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required field: email"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied. You don't have permission to access this resource."
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded. Try again in 15 minutes."
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error. Please try again later."
}
```

---

## Rate Limiting

**Global Limits:**
- 100 requests per minute
- 15-minute lockout on violation

**Per-User Limits:**
- 50 requests per minute
- Auto-blocks offending IP/email
- Admin can unblock via `/api/security/admin/block-ip`

---

## Privacy & Non-Tracking

All API responses automatically:
- ✅ Hide passwords, tokens, API keys
- ✅ Anonymize IP addresses (192.168.x.x)
- ✅ Hash emails in logs
- ✅ No tracking pixels or beacons
- ✅ Strip sensitive fields before response
- ✅ Cache with TTL and role-based access

---

## Implementation Checklist

- [ ] Import security modules in server.js
- [ ] Initialize firewall, privacy, cache, breach, chat
- [ ] Register all 4 endpoint groups
- [ ] Add single-email check to signup
- [ ] Create data/chats.json file
- [ ] Test all endpoints with test-security.js
- [ ] Configure admin credentials in .env
- [ ] Deploy to production with HTTPS
