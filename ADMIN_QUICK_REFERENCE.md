# Admin Quick Reference - admin@example.com

## 🔐 Login Credentials
```
Email: admin@example.com
Password: your_secure_password
Method: HTTP Basic Auth
```

## 📁 File Management (ADMIN ONLY)

### Upload File
```bash
curl -X POST http://localhost:3000/api/admin/upload \
  -u "admin@example.com:your_secure_password" \
  -F "file=@document.pdf" \
  -F "title=Investment Guide" \
  -F "price=0"
```

### Delete File
```bash
curl -X DELETE http://localhost:3000/api/admin/files/FILE_ID \
  -u "admin@example.com:your_secure_password"
```

---

## 💬 Chat Support (ADMIN ONLY - Reply Permission)

### View All Messages
```bash
curl http://localhost:3000/api/admin/messages \
  -u "admin@example.com:your_secure_password"
```

### Reply to Message (ADMIN EXCLUSIVE)
```bash
curl -X POST http://localhost:3000/api/admin/messages/MESSAGE_ID/reply \
  -u "admin@example.com:your_secure_password" \
  -H "Content-Type: application/json" \
  -d '{"reply":"Thank you for your message!"}'
```

**Note:** Public users can ONLY post messages. They CANNOT reply. Only admin can reply.

---

## 👥 User Access Control (ADMIN ONLY)

### Grant Premium Access
```bash
curl -X POST http://localhost:3000/api/admin/grant-premium \
  -u "admin@example.com:your_secure_password" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","days":30,"reason":"Admin approved"}'
```

### Revoke Premium Access
```bash
curl -X POST http://localhost:3000/api/admin/revoke-premium \
  -u "admin@example.com:your_secure_password" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

---

## 📊 Dashboard & Stats

### View All Users
```bash
curl http://localhost:3000/api/admin/users \
  -u "admin@example.com:your_secure_password"
```

### Dashboard Statistics
```bash
curl http://localhost:3000/api/admin/dashboard-stats \
  -u "admin@example.com:your_secure_password"
```

---

## 🚫 Access Restrictions

### ✅ ADMIN CAN:
- Upload/Delete/Update files
- Reply to chat messages
- Grant premium access
- Revoke premium access
- View all user data
- Send bulk emails
- Access all payment methods (bypass country restrictions)
- Access premium content (bypass subscription)

### ❌ REGULAR USERS CANNOT:
- Upload files (401 Forbidden)
- Reply to messages (can only post)
- Grant/revoke access
- View other users' data
- Access admin endpoints

---

## 🔑 Authentication Format

### Command Line (curl):
```bash
-u "admin@example.com:your_secure_password"
```

### JavaScript (fetch):
```javascript
const auth = btoa('admin@example.com:your_secure_password');
fetch('/api/admin/users', {
  headers: { 'Authorization': `Basic ${auth}` }
});
```

### HTTP Header:
```
Authorization: Basic ZGVsaWphaDU0MTVAZ21haWwuY29tOklzaG1hYWg1NDE1
```

---

## 📍 Admin Dashboard URL
```
Areas/Admin/Views/Dashboard/Index.cshtml
```

---

## ⚠️ Security Notes

1. **Unrestricted Access:** Admin bypasses ALL restrictions (premium, country, file access)
2. **Exclusive Permissions:** Only admin can upload files, reply to messages, grant/revoke access
3. **HTTPS Required:** Use HTTPS in production (Basic Auth is base64, not encrypted)
4. **All Actions Logged:** Admin activities tracked in storage-complex

---

**Full Documentation:** [ADMIN_CONTROL_GUIDE.md](ADMIN_CONTROL_GUIDE.md)
