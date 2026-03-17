# Quick Test Guide - GeoIP & Payment Methods

## 🌍 Test GeoIP Detection

### Using curl:
```bash
# Test local detection (should return KE for localhost)
curl http://localhost:3000/api/geo

# Simulate Kenya user
curl -H "cf-ipcountry: KE" http://localhost:3000/api/geo

# Simulate US user
curl -H "cf-ipcountry: US" http://localhost:3000/api/geo

# Simulate UK user
curl -H "cf-ipcountry: GB" http://localhost:3000/api/geo
```

### Expected Responses:
```json
// Kenya
{"country":"KE"}

// Any other country
{"country":"OTHER"}
```

---

## 💳 Test Payment Methods

### 1. Open Frontend
Navigate to: `http://localhost:3000/index.html`

### 2. Check Auto-Detection
- Country dropdown should auto-populate on page load
- For Kenya: M-Pesa and KCB buttons enabled (purple)
- For Others: Buttons disabled (gray) with "Kenya only" badge

### 3. Manual Override
- Change country dropdown
- Buttons should update instantly
- Selection persists in localStorage

### 4. Test Payment Flow (Kenya Only)
**M-Pesa:**
1. Click "Pay with M-Pesa"
2. Enter phone: `2547XXXXXXXX`
3. Enter amount: `1000`
4. Check for STK push on phone

**KCB Bank:**
1. Click "Pay via KCB Bank Transfer"
2. Enter name, email, amount
3. Receive bank details
4. Admin marks as paid in dashboard

---

## 👨‍💼 Test Admin Access

### 1. Login as Admin
```bash
# Credentials from .env
ADMIN_USER=admin@example.com
ADMIN_PASS=your_admin_password
```

### 2. Navigate to Admin Dashboard
URL: `http://localhost:3000/Areas/Admin/Views/Dashboard/Index.cshtml`

### 3. Verify Admin Features
- ✅ All payment methods accessible (no country restriction)
- ✅ Premium features accessible (no premium required)
- ✅ Can view all users/transactions
- ✅ Can send bulk emails
- ✅ Can mark KCB payments as paid

---

## 🔍 Verify No Duplicates

### Check Routes:
```bash
# Should show each route only once
grep -n "app.post.*'/api/auth/signup'" server.js
grep -n "app.post.*'/api/auth/login'" server.js
grep -n "app.post.*'/api/pay/mpesa'" server.js
```

**Expected Output:**
```
228:app.post('/api/auth/signup', ...
257:app.post('/api/auth/login', ...
59:app.post('/api/pay/mpesa', ...
```
*Each route appears exactly once*

### Check Files:
```bash
# Should return nothing
ls -1 | grep -E '^(<|export |import |<input)'
```

**Expected:** No output (all code-snippet-named files removed)

---

## 🐛 Troubleshooting

### GeoIP returns "OTHER" locally
**Fix:** This is expected. Localhost defaults to KE in development mode.

### Payment buttons not updating
**Fix:** 
1. Clear localStorage: `localStorage.removeItem('si_country')`
2. Refresh page
3. Check browser console for errors

### Admin can't access dashboard
**Fix:**
1. Verify credentials in `.env` match login
2. Check HTTP Basic Auth headers
3. Ensure `ADMIN_USER` email matches exactly

### M-Pesa callback not working
**Fix:**
1. Ensure `MPESA_CALLBACK_URL` is publicly accessible
2. Use ngrok/localtunnel for local testing
3. Check M-Pesa logs in `server.js` console

---

## ✅ Success Criteria

- [ ] `/api/geo` returns `{country: "KE"}` for Kenya
- [ ] `/api/geo` returns `{country: "OTHER"}` for non-Kenya
- [ ] Frontend auto-detects country on load
- [ ] M-Pesa/KCB buttons enabled for Kenya only
- [ ] Admin has unrestricted access
- [ ] No duplicate routes in `server.js`
- [ ] No code-snippet-named files in workspace
- [ ] Server starts without errors
- [ ] Payment callbacks grant premium automatically

---

## 📞 Quick Commands

```bash
# Start server
npm start

# Check logs
tail -f logs/activity.log

# Test signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Check premium status
curl http://localhost:3000/api/auth/me \
  -H "Cookie: si_token=YOUR_TOKEN_HERE"
```

---

**Last Updated:** 2025-01-24  
**Status:** ✅ All systems operational
