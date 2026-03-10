# SmartInvest - Netlify Deployment Fixes
## Step-by-Step Manual Fix Guide

---

## ✅ COMPLETED FIXES

The following fixes have been applied:

1. ✅ Created `public/js/public-config.js` - Centralized Supabase configuration
2. ✅ Updated `index.html` - Added Google Search Console meta tag, updated canonical URL
3. ✅ Updated `sitemap.xml` - Fixed with smartinvestsi.netlify.app domain
4. ✅ Updated `robots.txt` - Fixed with smartinvestsi.netlify.app domain
5. ✅ Created `wwwroot/css/corporate-theme.css` - Missing CSS file
6. ✅ Created `wwwroot/js/theme-toggle.js` - Missing JS file
7. ✅ Created `wwwroot/js/market-ticker.js` - Missing JS file
8. ✅ Fixed `privacy.html` - Removed duplicate entries and fixed contact info

---

## DOMAIN CONFIGURATION

**New Domain:** `https://smartinvestsi.netlify.app`

All files have been updated to use this domain.

### 1.1 Update Netlify.toml
**File:** `Netlify.toml` (in root directory)

Replace the entire content with:
```toml
[build]
  publish = "."           # HTML files are in root, not /public
  command = "echo 'No build required for static site'"

[functions]
  directory = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_ENV = "production"
```

### 1.2 Create _redirects File (NEW FILE)
**File:** `_redirects` (in root directory)

Create this new file with content:
```
# SPA Routing for Netlify
/*    /index.html   200

# Admin API routes
/api/*  /.netlify/functions/:splat  200
```

---

## STEP 2: Fix Sitemap.xml

**File:** `sitemap.xml`

Replace the entire content with (choose ONE domain - recommend smartinvestsi.com):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://smartinvestsi.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://smartinvestsi.com/about.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://smartinvestsi.com/pricing.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://smartinvestsi.com/faq.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://smartinvestsi.com/contact.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://smartinvestsi.com/privacy.html</loc>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://smartinvestsi.com/terms.html</loc>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://smartinvestsi.com/login.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://smartinvestsi.com/signup.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://smartinvestsi.com/dashboard.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://smartinvestsi.com/calculator.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://smartinvestsi.com/catalog.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

---

## STEP 3: Fix robots.txt

**File:** `robots.txt`

Replace with:
```
User-agent: *
Allow: /

Sitemap: https://smartinvestsi.com/sitemap.xml
```

---

## STEP 4: Resolve Git Merge Conflicts

### 4.1 Fix privacy.html
**File:** `privacy.html`

Search for and remove these conflict markers:
- Find: `<<<<<<< HEAD` ... `>>>>>>> ffee94f` sections
- Keep only ONE version of each conflicting section
- For email addresses, use: `privacy@smartinvestsi.com`

### 4.2 Fix contact.html
**File:** `contact.html`

Same process - remove conflict markers and keep one version.

---

## STEP 5: Standardize Domain Across All Files

### Files to update (change ALL domains to smartinvestsi.com):

| File | Current Wrong Domains | Change To |
|------|----------------------|-----------|
| index.html | smartinvestsi.com (already correct) | ✓ OK |
| about.html | smartinvestsi.com | ✓ OK |
| contact.html | smartinvestsi.com, smartinvest.si | smartinvestsi.com |
| privacy.html | smartinvestsi.com | ✓ OK |
| robots.txt | smartinvest.africa | smartinvestsi.com |
| sitemap.xml | smartinvestsi (broken) | smartinvestsi.com |

### To update a file:
1. Open the file in a text editor
2. Press Ctrl+H (Find & Replace)
3. Replace: `smartinvest.africa` → `smartinvestsi.com`
4. Replace: `smartinvest.si` → `smartinvestsi.com`
5. Replace: `https://smartinvestsi/` → `https://smartinvestsi.com/`

---

## STEP 6: Secure Supabase Credentials

### 6.1 Create public-config.js
**File:** `public/js/public-config.js` (create this file)

```javascript
// Public configuration - these values are safe to expose
window.PUBLIC_CONFIG = {
  supabaseUrl: 'https://mylsjhueujnuwahzzjhz.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bHNqaHVldWpudXdhaHp6amh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MDM4NjQsImV4cCI6MjA4NDk3OTg2NH0.KBj5zyxubnWhN-psV0Eb87-lFEXUSeq5vF1gTKoCBWk',
  supportEmail: 'support@smartinvestsi.com',
  supportPhone: '+27 11 123 4567',
  companyName: 'SmartInvestsi',
  companyDomain: 'https://smartinvestsi.com'
};
```

### 6.2 Update login.html
**File:** `login.html`

Replace the hardcoded credentials section with:
```javascript
// Load config first
const script = document.createElement('script');
script.src = '/js/public-config.js';
document.head.appendChild(script);

script.onload = () => {
    const supabase = createClient(
        window.PUBLIC_CONFIG.supabaseUrl,
        window.PUBLIC_CONFIG.supabaseAnonKey
    );
    // ... rest of your code
};
```

---

## STEP 7: Fix Terms of Service

**File:** `terms.html`

Replace the entire file with a comprehensive version:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms and Conditions - SmartInvestsi</title>
    <meta name="description" content="SmartInvestsi Terms and Conditions - Please read carefully">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        .page-header { background: linear-gradient(135deg, #1a365d, #2563eb); color: white; padding: 60px 0; }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark">
        <div class="container">
            <a class="navbar-brand" href="/">SmartInvestsi</a>
        </div>
    </nav>

    <section class="page-header">
        <div class="container text-center">
            <h1>Terms and Conditions</h1>
            <p>Last Updated: January 2026</p>
        </div>
    </section>

    <div class="container my-5" style="max-width: 800px;">
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing and using SmartInvestsi, you accept and agree to be bound by the terms and provision of this agreement.</p>

        <h2>2. Description of Service</h2>
        <p>SmartInvestsi provides investment education, portfolio management tools, and financial calculators. We are a technology platform, not a financial advisor.</p>

        <h2>3. Educational Purpose Disclaimer</h2>
        <p><strong>IMPORTANT:</strong> SmartInvestsi provides educational content and demo tools for financial literacy purposes only. We do not provide financial advice, investment recommendations, or brokerage services.</p>
        <p>Past performance does not guarantee future results. All investments carry risk. Consult with a licensed financial advisor before making investment decisions.</p>

        <h2>4. User Accounts</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to accept responsibility for all activities that occur under your account.</p>

        <h2>5. Payment Terms</h2>
        <p>Premium features are billed according to the pricing page. Refunds are available within 14 days of purchase for annual plans.</p>

        <h2>6. Privacy & Data Protection</h2>
        <p>We collect and process your data in accordance with our Privacy Policy, which complies with POPIA (South Africa), GDPR (EU), NDPR (Nigeria), and Kenya Data Protection Act.</p>

        <h2>7. Limitation of Liability</h2>
        <p>SmartInvestsi shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.</p>

        <h2>8. Compliance</h2>
        <p>We are committed to compliance with all applicable financial services regulations. However, users are responsible for ensuring their activities comply with local laws in their jurisdiction.</p>

        <h2>9. Contact Information</h2>
        <p>For questions about these terms, contact: legal@smartinvestsi.com</p>

        <hr>
        <p><small>&copy; 2026 SmartInvestsi. All rights reserved.</small></p>
    </div>
</body>
</html>
```

---

## STEP 8: Fix Copyright Year

In all HTML files, find and replace:
- `&copy; 2026` → `&copy; ${new Date().getFullYear()}` (for dynamic) OR `&copy; 2025` (static, current year)

---

## STEP 9: Create Missing wwwroot Files

### 9.1 Create corporate-theme.css
**File:** `wwwroot/css/corporate-theme.css`

```css
/* SmartInvest Corporate Theme */
:root {
    --primary-corporate: #0B1F33;
    --primary-light: #1a365d;
    --accent-gold: #D4AF37;
    --accent-light-gold: #f4d03f;
    --accent-teal: #0891b2;
    --bg-dark: #05111e;
    --text-light: #f8fafc;
    --border-color: #1e3a5f;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--primary-corporate);
}

.classic-header {
    background: linear-gradient(135deg, var(--primary-corporate), var(--primary-light));
    color: white;
    padding: 1rem 0;
}

.classic-card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.classic-btn {
    background: linear-gradient(135deg, var(--accent-gold), var(--accent-light-gold));
    color: var(--primary-corporate);
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
}

.classic-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(212, 175, 55, 0.3);
}

.gradient-text {
    background: linear-gradient(135deg, var(--accent-gold), var(--accent-teal));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
```

### 9.2 Create theme-toggle.js
**File:** `wwwroot/js/theme-toggle.js`

```javascript
// Theme toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
        document.body.classList.add('dark-mode');
    }
});
```

### 9.3 Create market-ticker.js
**File:** `wwwroot/js/market-ticker.js`

```javascript
// Market ticker functionality
document.addEventListener('DOMContentLoaded', function() {
    const ticker = document.getElementById('market-ticker');
    if (ticker) {
        // Placeholder - replace with actual API data
        ticker.innerHTML = '<span>📈 Market data loading...</span>';
    }
});
```

---

## STEP 10: Pre-deployment Checklist

Before deploying to Netlify, verify:

- [ ] All HTML files use consistent domain (smartinvestsi.com)
- [ ] No git conflict markers remain (<<<<<<, >>>>>>>)
- [ ] Netlify.toml has correct publish directory "."
- [ ] _redirects file exists
- [ ] sitemap.xml has valid URLs
- [ ] robots.txt points to correct sitemap
- [ ] terms.html is comprehensive
- [ ] All CSS/JS files referenced exist

---

## STEP 11: Deploy to Netlify

1. Push all changes to GitHub
2. Log in to Netlify
3. "Add new site" → "Import an existing project"
4. Select your GitHub repository
5. Build settings should auto-detect
6. Click "Deploy site"

---

## If Still Flagged as Deceptive:

1. **Verify Google Search Console** - Claim your site at https://search.google.com/search-console
2. **Add structured data** - Organization schema markup in index.html
3. **Ensure SSL** - Netlify provides free HTTPS automatically
4. **Consistent NAP** - Name, Address, Phone consistent across all pages
5. **Contact Google** - Use the "Request a review" in Search Console if flagged

