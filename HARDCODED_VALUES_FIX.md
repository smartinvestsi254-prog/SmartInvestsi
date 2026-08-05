# SmartInvestsi - Hardcoded Values Cleanup & Fixes

## 🔍 Issues Found & Fixed

### Critical Issues

| File | Issue | Severity | Fix |
|------|-------|----------|-----|
| `signup.html:243` | `data-sitekey="YOUR_HCAPTCHA_SITEKEY"` | 🔴 Critical | Use env variable |
| `src/server.ts:5` | Sentry DSN hardcoded | 🔴 Critical | Move to Netlify env |
| `src/config.ts:50` | Admin email hardcoded | 🟡 Medium | Move to env |
| HTML files | Multiple domain hardcodes | 🟡 Medium | Use config file |

---

## ✅ FIXES APPLIED

### Fix #1: signup.html - hCaptcha Site Key

**Before (❌ Wrong):**
```html
<div class="h-captcha" data-sitekey="YOUR_HCAPTCHA_SITEKEY"></div>
```

**After (✅ Correct):**
```html
<!-- In HEAD or script -->
<script>
  // Load from config or environment
  const hcaptchaSitekey = window.PUBLIC_CONFIG?.hcaptchaSitekey || 
                         document.getElementById('hcaptcha-config')?.dataset.sitekey;
</script>

<!-- In BODY -->
<div class="h-captcha" data-sitekey="" id="hcaptcha-widget"></div>

<script>
  // After page load, set the sitekey
  document.addEventListener('DOMContentLoaded', () => {
    const widget = document.getElementById('hcaptcha-widget');
    if (hcaptchaSitekey) {
      widget.setAttribute('data-sitekey', hcaptchaSitekey);
    }
  });
</script>
```

### Fix #2: src/server.ts - Sentry DSN

**Before (❌ Wrong):**
```typescript
Sentry.init({
  dsn: "https://932acfc8ce257a2cc55753590d838955@4511098961526784.ingest.de.sentry.io/4511098974568528",
  sendDefaultPii: true,
});
```

**After (✅ Correct):**
```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  sendDefaultPii: process.env.NODE_ENV !== 'production',
  tracesSampleRate: process.env.SENTRY_TRACE_SAMPLE_RATE ? 
    parseFloat(process.env.SENTRY_TRACE_SAMPLE_RATE) : 0.1,
  environment: process.env.NODE_ENV,
});
```

### Fix #3: src/config.ts - Admin Email

**Before (❌ Wrong):**
```typescript
ADMIN_EMAIL: 'smartinvestsi254@gmail.com',
```

**After (✅ Correct):**
```typescript
ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@smartinvestsi.com',
```

### Fix #4: HTML Files - Domain URLs

**Pattern (❌ Wrong):**
```html
<link rel="canonical" href="https://smartinvestsi.netlify.app/login.html">
<meta property="og:url" content="https://smartinvestsi.netlify.app/about.html">
```

**Fix (✅ Correct):**
```html
<!-- In public/js/config.js -->
window.CONFIG = {
  domain: 'https://smartinvestsi.netlify.app',
  // ... other config
};

<!-- In HTML files -->
<link rel="canonical" id="canonical-link">
<meta property="og:url" content="" id="og-url">

<script>
  // Set dynamically from config
  document.getElementById('canonical-link').href = window.CONFIG.domain + window.location.pathname;
  document.getElementById('og-url').content = window.CONFIG.domain + window.location.pathname;
</script>
```

---

## 🔧 Implementation Guide

### Step 1: Update `src/config.ts`

```typescript
/**
 * Non-secret configuration for SmartInvest
 * Real secrets remain in .env / Netlify environment variables
 */

export const CONFIG = {
  // ✅ SAFE - These are public and non-sensitive
  APP: {
    URL: process.env.NEXT_PUBLIC_APP_URL || 'https://smartinvestsi.netlify.app',
    ENVIRONMENT: process.env.NODE_ENV || 'development',
  },

  // ✅ SAFE - Public API keys
  SUPABASE: {
    URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  HCAPTCHA: {
    SITEKEY: process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY,
  },

  PAYPAL: {
    CLIENT_ID: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
    MODE: process.env.PAYPAL_MODE || 'sandbox',
  },

  // ✅ SAFE - Non-sensitive configuration
  MPESA: {
    SHORTCODE: process.env.NEXT_PUBLIC_MPESA_SHORTCODE || '8038267',
    ENV: process.env.MPESA_ENV || 'sandbox',
    CALLBACK_URL: process.env.NEXT_PUBLIC_MPESA_CALLBACK_URL,
    DISCOVERY_URL: process.env.MPESA_ENV === 'production' 
      ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
  },

  // ✅ SAFE - Crypto addresses (public)
  CRYPTO: {
    RECEIVER_ADDRESSES: {
      btc: process.env.NEXT_PUBLIC_CRYPTO_BTC_ADDRESS || '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      eth: process.env.NEXT_PUBLIC_CRYPTO_ETH_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    },
  },

  // ✅ SAFE - Logging configuration
  LOGGING: {
    LEVEL: process.env.LOG_LEVEL || 'info',
    SENTRY_DSN: process.env.SENTRY_DSN,
  },

  // ✅ SAFE - Admin configuration (non-sensitive)
  ADMIN: {
    EMAIL: process.env.ADMIN_EMAIL || 'admin@smartinvestsi.com',
    FALLBACK_KEY: process.env.ADMIN_FALLBACK_KEY ? 'enabled' : 'disabled',
  },

  // ⚠️ BACKEND ONLY - Never access from frontend!
  SECRETS: {
    JWT_SECRET: process.env.JWT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
} as const;

// ✅ Use this to ensure secrets don't leak to frontend
export const getPublicConfig = () => ({
  APP: CONFIG.APP,
  SUPABASE: CONFIG.SUPABASE,
  HCAPTCHA: CONFIG.HCAPTCHA,
  PAYPAL: CONFIG.PAYPAL,
  MPESA: CONFIG.MPESA,
  CRYPTO: CONFIG.CRYPTO,
  LOGGING: CONFIG.LOGGING,
  ADMIN: CONFIG.ADMIN,
});

export const getBackendConfig = () => {
  if (typeof window !== 'undefined') {
    throw new Error('❌ Cannot access backend secrets from frontend!');
  }
  return CONFIG.SECRETS;
};

export default CONFIG;
```

### Step 2: Create `public/js/config.js`

```javascript
/**
 * Public configuration loaded from environment
 * Frontend-safe values only
 */

window.APP_CONFIG = {
  domain: window.location.origin.includes('localhost') 
    ? 'http://localhost:3000'
    : 'https://smartinvestsi.netlify.app',
  
  api: {
    baseUrl: '/.netlify/functions',
    timeout: 10000,
  },

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  hcaptcha: {
    sitekey: process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY,
  },

  paypal: {
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
  },

  analytics: {
    enabled: process.env.ENABLE_ANALYTICS === 'true',
  },
};

// Validate critical config on load
document.addEventListener('DOMContentLoaded', () => {
  if (!window.APP_CONFIG.supabase.url) {
    console.warn('⚠️ SUPABASE_URL not configured');
  }
  if (!window.APP_CONFIG.supabase.anonKey) {
    console.warn('⚠️ SUPABASE_ANON_KEY not configured');
  }
});
```

### Step 3: Update HTML Files

**In login.html, signup.html, dashboard.html:**

```html
<!-- Add this in <head> -->
<script src="/public/js/config.js"></script>
<script>
  // Set dynamic URLs
  (function() {
    const updateDynamicUrls = () => {
      // Update canonical link
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical && window.APP_CONFIG) {
        canonical.href = window.APP_CONFIG.domain + window.location.pathname;
      }

      // Update OG tags
      document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
        if (meta.getAttribute('property') === 'og:url') {
          meta.content = window.APP_CONFIG.domain + window.location.pathname;
        }
      });

      // Load hCaptcha sitekey
      if (window.APP_CONFIG.hcaptcha?.sitekey) {
        const hcaptchaWidget = document.querySelector('.h-captcha');
        if (hcaptchaWidget) {
          hcaptchaWidget.setAttribute('data-sitekey', window.APP_CONFIG.hcaptcha.sitekey);
        }
      }
    };

    // Run on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', updateDynamicUrls);
    } else {
      updateDynamicUrls();
    }
  })();
</script>
```

---

## 📋 Environment Variables to Add

### Add to `.env.example` (for repo):
```env
# Frontend-safe public configuration
NEXT_PUBLIC_APP_URL=https://smartinvestsi.netlify.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_HCAPTCHA_SITEKEY=your-sitekey
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your-client-id
NEXT_PUBLIC_MPESA_SHORTCODE=8038267
```

### Add to Netlify (Site Settings → Environment):
```
SENTRY_DSN=https://your-sentry-dsn@sentry.io/id
SENTRY_TRACE_SAMPLE_RATE=0.1
ADMIN_EMAIL=admin@smartinvestsi.com
MPESA_ENV=sandbox
```

---

## ✅ Verification Checklist

- [ ] No hardcoded API keys in JavaScript files
- [ ] No hardcoded database credentials
- [ ] No hardcoded domain URLs (use `window.APP_CONFIG.domain`)
- [ ] All secrets in Netlify environment variables
- [ ] All public config in `.env.example`
- [ ] `src/config.ts` uses `process.env.*`
- [ ] `public/js/config.js` loads from environment
- [ ] HTML files use dynamic URLs from config
- [ ] Frontend cannot access `SECRETS` config
- [ ] Tests pass without exposing secrets
- [ ] `npm run lint` passes (detects hardcoded values)

---

## 🔐 Security Validation Script

```bash
#!/bin/bash
# scripts/validate-secrets.sh

echo "🔍 Scanning for hardcoded secrets..."

# Patterns to detect
PATTERNS=(
  "password"
  "api_key"
  "apiKey"
  "secret"
  "token"
  "Authorization: Bearer"
  "sk_live_"
  "sk_test_"
  "pk_live_"
  "pk_test_"
)

FOUND=0
for pattern in "${PATTERNS[@]}"; do
  if grep -r "$pattern" --include="*.js" --include="*.ts" --include="*.tsx" --include="*.jsx" . \
     --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist 2>/dev/null | \
     grep -v "process.env" | grep -v "//.*$pattern" > /dev/null; then
    echo "❌ Found potential secret: $pattern"
    grep -r "$pattern" --include="*.js" --include="*.ts" --include="*.tsx" --include="*.jsx" . \
      --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist 2>/dev/null | \
      grep -v "process.env" | grep -v "//.*$pattern" | head -3
    FOUND=$((FOUND + 1))
  fi
done

if [ $FOUND -eq 0 ]; then
  echo "✅ No hardcoded secrets found!"
  exit 0
else
  echo "❌ Found $FOUND potential secrets!"
  exit 1
fi
```

Run with:
```bash
chmod +x scripts/validate-secrets.sh
./scripts/validate-secrets.sh
```

---

## 📚 Summary

| Before (❌) | After (✅) |
|-----------|-----------|
| Hardcoded URLs | `window.APP_CONFIG.domain` |
| Hardcoded sitekeys | `process.env.NEXT_PUBLIC_*` |
| API secrets in repo | Secrets only in Netlify |
| Brittle deployment | Environment-driven |
| Security vulnerabilities | No exposed credentials |

---

**Last Updated**: June 2026  
**Status**: ✅ All fixes documented and ready to implement
