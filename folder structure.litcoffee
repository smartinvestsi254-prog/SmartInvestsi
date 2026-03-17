SmartInvestsi/
├─ netlify/
│  └─ functions/                # Serverless functions (backend)
│     ├─ payments.js            # Example: PayPal / M-Pesa / OKX functions
│     ├─ auth.js                # Example: JWT auth, login/signup
│     └─ db.js                  # Database connections (MongoDB/Supabase)
├─ src/                          # Frontend source code
│  ├─ components/
│  ├─ pages/
│  └─ utils/
├─ .env                          # Local development secrets (ignored by git)
├─ .gitignore
├─ package.json
└─ netlify.toml                  # Netlify build & functions config