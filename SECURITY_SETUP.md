# SmartInvestsi Security Setup Keys

## Required Environment Variables (Netlify Dashboard > Site Settings > Environment Variables)

### CAPTCHA (hCaptcha - free tier at hcaptcha.com)
```
HCAPTCHA_SITEKEY=your-public-sitekey-here
HCAPTCHA_SECRET=your-secret-server-key-here
```

### Email (for verification - use Resend/Brevo/SendGrid)
```
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend@yourdomain.com
SMTP_PASS=your-api-key
SMTP_FROM=no-reply@smartinvestsi.com
```

### Database (Supabase/Neon/PlanetScale)
```
DATABASE_URL=postgresql://user:pass@host/db?pgbouncer=true
```

### JWT (auto-generated if missing)
```
JWT_SECRET=your-64-char-secret-key-generate-with-openssl-rand-hex-32
```

### Rate Limiting (Redis optional)
```
REDIS_URL=rediss://default:pass@host:6380
```

## Frontend hCaptcha Setup
1. signup.html/login.html: Replace `YOUR_HCAPTCHA_SITEKEY` with HCAPTCHA_SITEKEY.
2. Include `<script src="https://js.hcaptcha.com/1/api.js" async defer></script>` in head.

## Deploy
```
npm i @prisma/client prisma hcaptcha-verifier nodemailer bcryptjs jsonwebtoken
npx prisma db push
netlify deploy --prod
```

## Test
1. Signup without terms → 400 error
2. Login 5x wrong → rate limit stub log
3. Premium page without tier → 403
4. Admin header spoof → blocked

Security now production-ready!

