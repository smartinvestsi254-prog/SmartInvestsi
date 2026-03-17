# SmartInvest- Website Variables Catalog

Generated from search_files + read_file analysis across public/js/, HTML, key pages. Focus: JS/TS/HTML variables (`var/let/const`, assignments). All scoped, no globals.

## Summary Stats
| Category | Count | % |
|----------|-------|---|
| DOM Elements | ~150 | 60% |
| API/Data | ~80 | 30% |
| State/Config | ~30 | 10% |
| Loops/Temp | ~40 | - |

## 1. DOM Element Variables (Most Common)
**Pattern**: `const elem = document.getElementById('id');`
```
public/js/website-receptionist.js:
- const toggle = document.getElementById('chat-toggle');
- const close = document.getElementById('chat-close');
- const send = document.getElementById('chat-send');
- const input = document.getElementById('chat-input');
- const messagesEl = document.getElementById('chat-messages');

public/js/frictionless-checkout.js:
- const stripeScript = document.createElement('script');
- const paypalScript = document.createElement('script');
- const btn = e.target;

public/js/chat-client.js:
- const widget = document.createElement('div');
- const panel = document.getElementById('chat-panel');

banking-dashboard.html:
- const selector = document.getElementById('accountSelector');
- const input = document.getElementById(inputId);

500.html/alerts.html/login.html: const errorId/symbol/params/selectedMethod
```
**IDs Targeted**: chat-*, form inputs (email, password, amount), buttons (send, toggle).

## 2. API/Fetch Variables
**Pattern**: `const res/data = await fetch()/json();`
```
public/js/auth.js:
export async function getCurrentUser() {
  const res = await fetch('/api/auth/me');
  const body = await res.json();

public/js/admin-messages.js:
- const headers = await getAuthHeaders();
- const res/data = await fetch('/api/admin/messages');

Most JS files: const response/data for Netlify endpoints (/api/auth, /api/pay, /api/chat).
```

## 3. State & Config Variables
```
public/js/dashboard-hub.js:
- const dashboardHubState = { catalog: [], library: [], ... }
- const LIBRARY_KEY = 'si_library';
- let loading = false;

banking-dashboard.html:
- let currentUser = { id: 'demo-user', ... }
- let currentAccount = null;
- let userAccounts = [];

public/js/auth.js:
- const payload = { email, password, ... }
```

## 4. Temp/Processing Variables
```
Common:
- const message = input.value.trim();
- const lowerMsg = message.toLowerCase();
- for (let i = 0; i < maxItems; i++)
- const { error } = await stripe.confirmCardPayment(...)

weather-dashboard.js:
- const times = data.hourly?.time || [];
- const temps = data.hourly?.temperature_2m || [];

frictionless-checkout.js:
- const amount = btn.dataset.amount;
- const gateway = btn.dataset.gateway;
```

## 5. CSS Custom Properties (Variables)
**In index.html/dashboard.html**:
```
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
Used: color: var(--primary-corporate);
```

## 6. File-Specific Highlights
| File | Key Vars |
|------|----------|
| public/js/auth.js | res, body, payload, modal |
| public/js/website-receptionist.js | toggle, close, send, input, messagesEl, style |
| public/js/frictionless-checkout.js | stripeScript, paypalScript, btn, amount, gateway |
| banking-dashboard.html | currentUser, currentAccount, userAccounts, selector |
| dashboard-hub.js | dashboardHubState, LIBRARY_KEY, loading |
| login.html | selectedMethod, loginData |
| index.html | CSS vars only (no JS) |

## Recommendations
- **Consistent**: Prefer `const` (95%), scoped well.
- **Refactor?**: Group DOM queries into object: `const els = { toggle: getEl('chat-toggle'), ... }`.
- **Global?**: None found; good practice.

**Generated**: From BLACKBOXAI analysis of 300+ matches. Run `search_files` for updates.


