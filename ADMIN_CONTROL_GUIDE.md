# Admin Control Guide - SmartInvest

## 👨‍💼 Admin Account

**Email:** `admin@example.com`  
**Access Level:** Unrestricted (Full Control)  
**Authentication:** HTTP Basic Auth + JWT Token

---

## 🔑 Admin Credentials

Configure in `.env`:
```env
ADMIN_USER=admin@example.com
ADMIN_PASS=your_secure_password
ADMIN_EMAIL=admin@example.com
```

---

## ✅ Admin Privileges

### 1. **Unrestricted Bypass**
Admin automatically bypasses ALL restrictions:
- ✅ Premium content access (no subscription required)
- ✅ Country restrictions (payment methods available globally)
- ✅ File access controls
- ✅ API rate limits

**Implementation:** `requirePremium` middleware (lines 1209-1241 in server.js)
```javascript
// Admin bypass via HTTP Basic Auth
if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
  req.isAdmin = true;
  return next(); // Bypass premium check
}
```

---

## 📁 File Management (Admin Only)

### Upload Files
**Endpoint:** `POST /api/admin/upload`  
**Auth Required:** ✅ adminAuth middleware  
**Public Access:** ❌ Forbidden (401 Unauthorized)

```bash
curl -X POST http://localhost:3000/api/admin/upload \
  -u "admin@example.com:your_secure_password" \
  -F "file=@document.pdf" \
  -F "title=Investment Guide" \
  -F "description=Comprehensive investment guide for beginners" \
  -F "price=0"
```

**Alternative Upload Endpoint:** `POST /api/admin/files/upload`

### Delete Files
**Endpoint:** `DELETE /api/admin/files/:id`  
**Auth Required:** ✅ adminAuth middleware  
**Public Access:** ❌ Forbidden

```bash
curl -X DELETE http://localhost:3000/api/admin/files/abc-123 \
  -u "admin@example.com:your_secure_password"
```

### Update File Metadata
**Endpoint:** `POST /api/admin/files/:id`  
**Auth Required:** ✅ adminAuth middleware

```bash
curl -X POST http://localhost:3000/api/admin/files/abc-123 \
  -u "admin@example.com:your_secure_password" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title","description":"New description","price":500}'
```

---

## 💬 Chat Support Management (Admin Only)

### View All Messages
**Endpoint:** `GET /api/admin/messages`  
**Auth Required:** ✅ adminAuth middleware  
**Public Endpoint:** `GET /api/messages` (read-only, cannot reply)

```bash
curl http://localhost:3000/api/admin/messages \
  -u "admin@example.com:your_secure_password"
```

### Reply to Messages (ADMIN ONLY)
**Endpoint:** `POST /api/admin/messages/:id/reply`  
**Auth Required:** ✅ adminAuth middleware  
**Public Access:** ❌ Forbidden (only admin can reply)

```bash
curl -X POST http://localhost:3000/api/admin/messages/msg-id-123/reply \
  -u "admin@example.com:your_secure_password" \
  -H "Content-Type: application/json" \
  -d '{"reply":"Thank you for your message. We will assist you shortly."}'
```

**Features:**
- Reply attributed to admin: `by: "admin@example.com"`
- Auto-notifies original sender via email (if provided)
- Replies stored in `data/messages.json`

**User Flow:**
1. Visitor posts message via `POST /api/messages` (no auth required)
2. Admin receives email notification of new message
3. Admin views messages via dashboard or `GET /api/admin/messages`
4. Admin replies via `POST /api/admin/messages/:id/reply`
5. Visitor receives email with admin's reply

---

## 👥 User Access Management (Admin Only)

### Grant Premium Access
**Endpoint:** `POST /api/admin/grant-premium`  
**Auth Required:** ✅ adminAuth middleware  
**Public Access:** ❌ Forbidden

```bash
curl -X POST http://localhost:3000/api/admin/grant-premium \
  -u "admin@example.com:your_secure_password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "days": 30,
    "reason": "Admin granted - special promotion"
  }'
```

**Parameters:**
- `email` (required): User's email address
- `days` (optional): Premium duration in days (default: 30)
- `reason` (optional): Grant reason (default: "manual_admin_grant")

**Effects:**
- Sets `isPremium: true` on user account
- Sets `premiumExpiresAt` to current date + days
- Records `premiumGrantedBy: "admin@example.com"`
- Sends premium welcome email to user
- Updates `data/users.json`

### Revoke Premium Access
**Endpoint:** `POST /api/admin/revoke-premium`  
**Auth Required:** ✅ adminAuth middleware  
**Public Access:** ❌ Forbidden

```bash
curl -X POST http://localhost:3000/api/admin/revoke-premium \
  -u "admin@example.com:your_secure_password" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

**Effects:**
- Sets `isPremium: false` immediately
- Removes `premiumExpiresAt`
- Records `premiumRevokedAt` timestamp
- Sends revocation notification email
- Updates `data/users.json`

---

## 📊 Admin Dashboard Endpoints

### Dashboard Statistics
**Endpoint:** `GET /api/admin/dashboard-stats`  
**Auth Required:** ✅ adminAuth

```bash
curl http://localhost:3000/api/admin/dashboard-stats \
  -u "admin@example.com:your_secure_password"
```

**Returns:**
```json
{
  "success": true,
  "totalUsers": 150,
  "premiumUsers": 42,
  "filesCount": 28,
  "pendingMessages": 5,
  "totalPurchases": 67
}
```

### List All Users
**Endpoint:** `GET /api/admin/users`  
**Auth Required:** ✅ adminAuth

**Returns:** Sanitized user list with:
- Email, premium status, expiration date
- Last 10 activity logs per user
- Excludes password hashes

### Storage Complex Data
**Endpoint:** `GET /api/admin/storage-complex`  
**Auth Required:** ✅ adminAuth

View all crash logs, cache, user activities, and admin actions.

**Get by Type:**
- `GET /api/admin/storage-complex/crashes`
- `GET /api/admin/storage-complex/users`
- `GET /api/admin/storage-complex/admin`
- `GET /api/admin/storage-complex/logs`

---

## 🔒 Security Implementation

### Admin Authentication Middleware
**Location:** [server.js](server.js#L17-L33)

```javascript
function adminAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  
  const creds = Buffer.from(auth.split(' ')[1], 'base64').toString('utf8');
  const [user, pass] = creds.split(':');
  
  if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
    return next(); // Admin verified
  }
  
  return res.status(401).json({ error: 'Invalid admin credentials' });
}
```

**All Admin Endpoints Protected:**
- ✅ `/api/admin/upload` - File uploads
- ✅ `/api/admin/files/:id` - File management
- ✅ `/api/admin/messages` - View all messages
- ✅ `/api/admin/messages/:id/reply` - Reply to messages
- ✅ `/api/admin/grant-premium` - Grant access
- ✅ `/api/admin/revoke-premium` - Revoke access
- ✅ `/api/admin/users` - User management
- ✅ `/api/admin/dashboard-stats` - Analytics
- ✅ `/api/admin/storage-complex` - System data

---

## 🌍 Country & Payment Restrictions

**Admin Override:**  
Admin is NOT restricted by country detection. All payment methods (M-Pesa, KCB, PayPal) are available to admin globally.

**Regular Users:**
- Kenya (`KE`): M-Pesa and KCB enabled
- Other countries: M-Pesa/KCB disabled (PayPal available)

**Implementation:**  
GeoIP detection via `/api/geo` affects frontend button states only. Admin has unrestricted access to all payment processing endpoints.

---

## 📧 Email Capabilities (Admin Only)

### Send Individual Email
**Endpoint:** `POST /api/admin/send-email`  
**Auth Required:** ✅ adminAuth

```bash
curl -X POST http://localhost:3000/api/admin/send-email \
  -u "admin@example.com:your_secure_password" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Account Update",
    "text": "Your account has been updated.",
    "html": "<p>Your account has been <strong>updated</strong>.</p>"
  }'
```

### Send Bulk Email
**Endpoint:** `POST /api/admin/send-bulk-email`  
**Recipients:**
- `all-users` - Every registered user
- `premium-users` - Only active premium subscribers
- `free-users` - Non-premium users only
- `inactive` - Users inactive for 7+ days

---

## 🧪 Testing Admin Access

### Test Basic Auth:
```bash
# Should return 401 (unauthorized)
curl http://localhost:3000/api/admin/users

# Should return user list
curl http://localhost:3000/api/admin/users \
  -u "admin@example.com:your_secure_password"
```

### Test Premium Bypass:
```bash
# Admin can access premium content without premium subscription
curl http://localhost:3000/api/premium/content \
  -H "Authorization: Basic $(echo -n 'admin@example.com:your_secure_password' | base64)"
```

### Test File Upload (Admin Only):
```bash
# Regular users: 401 Forbidden
curl -X POST http://localhost:3000/api/admin/upload \
  -F "file=@test.pdf"
# Response: {"error":"Admin authentication required"}

# Admin: Success
curl -X POST http://localhost:3000/api/admin/upload \
  -u "admin@example.com:your_secure_password" \
  -F "file=@test.pdf" \
  -F "title=Test Document"
# Response: {"success":true,"file":{...}}
```

### Test Message Reply (Admin Only):
```bash
# Public can post but NOT reply
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","message":"Hello!"}'
# Response: {"success":true}

# Regular user tries to reply: 401 Forbidden
curl -X POST http://localhost:3000/api/admin/messages/msg-123/reply \
  -H "Content-Type: application/json" \
  -d '{"reply":"Thanks!"}'
# Response: {"error":"Admin authentication required"}

# Admin reply: Success
curl -X POST http://localhost:3000/api/admin/messages/msg-123/reply \
  -u "admin@example.com:your_secure_password" \
  -H "Content-Type: application/json" \
  -d '{"reply":"Thanks for reaching out!"}'
# Response: {"success":true,"reply":{...}}
```

---

## 🚫 What Admin CANNOT Do

Even with full access, certain operations are restricted for security:

1. **Cannot directly modify `users.json`** - Must use API endpoints
2. **Cannot bypass MPESA/PayPal verification** - Payment webhooks verify signatures
3. **Cannot impersonate users** - Admin actions are logged separately
4. **Cannot disable audit trails** - All admin actions logged to storage-complex

---

## 📝 Admin Activity Logging

All admin actions are logged to `storage-complex`:

```javascript
storageComplex.addAdminEntry(
  'admin@example.com',
  'grant_premium',
  { targetUser: 'user@example.com', days: 30 }
);
```

**View Admin Logs:**
```bash
curl http://localhost:3000/api/admin/storage-complex/admin \
  -u "admin@example.com:your_secure_password"
```

---

## 🔐 Security Best Practices

1. **Never share admin credentials** - `ADMIN_PASS` should be strong and unique
2. **Use HTTPS in production** - HTTP Basic Auth transmits base64 (not encrypted)
3. **Rotate passwords regularly** - Update `.env` and restart server
4. **Monitor admin logs** - Review `storage-complex/admin` for unauthorized access
5. **Restrict `.env` file permissions** - `chmod 600 .env` on server

---

## 📞 Quick Reference

### Admin Login (Frontend)
```javascript
// Use HTTP Basic Auth
const credentials = btoa('admin@example.com:your_secure_password');
fetch('/api/admin/users', {
  headers: {
    'Authorization': `Basic ${credentials}`
  }
});
```

### Admin Dashboard URL
**Admin Panel:** `Areas/Admin/Views/Dashboard/Index.cshtml`  
**Access:** Login with admin credentials via HTTP Basic Auth

### Emergency Admin Reset
If admin credentials are lost:
1. Edit `.env` file directly on server
2. Update `ADMIN_USER` and `ADMIN_PASS`
3. Restart server: `npm restart`
4. Test: `curl -u "new-email:new-pass" http://localhost:3000/api/admin/users`

---

## ✅ Summary

**Admin:** admin@example.com  
**Capabilities:**
- ✅ Upload/Delete/Update Files (exclusive)
- ✅ Reply to Chat Messages (exclusive)
- ✅ Grant Premium Access (exclusive)
- ✅ Revoke Premium Access (exclusive)
- ✅ View All User Data (exclusive)
- ✅ Send Bulk Emails (exclusive)
- ✅ Unrestricted bypass of premium/country checks
- ✅ Access all payment methods globally

**Public Users:**
- ❌ Cannot upload files
- ❌ Cannot reply to messages (can only post)
- ❌ Cannot grant/revoke access
- ❌ Cannot view other users' data
- ✅ Can view own premium status
- ✅ Can access content based on subscription

---

**Last Updated:** 2025-01-24  
**Admin Account:** admin@example.com  
**Status:** ✅ Fully Configured & Secured
