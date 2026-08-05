# Secret Management Guide

## Overview

This document outlines how secrets and sensitive information should be managed in the SmartInvest application.

## ⚠️ Never Commit Secrets

**Never** commit the following to version control:
- API keys (M-Pesa, PayPal, Stripe, etc.)
- Passwords and credentials
- JWT secret keys
- Private keys and certificates
- Database connection strings with passwords
- OAuth client secrets
- Email passwords
- Any production credentials

## ✅ Using Environment Variables

All secrets should be stored in environment variables and loaded from a `.env` file.

### Setup

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual values in `.env`

3. **Never commit `.env`** - it's already in `.gitignore`

### Accessing Secrets

In Node.js/JavaScript:
```javascript
const jwtSecret = process.env.JWT_SECRET;
const mpesaKey = process.env.MPESA_CONSUMER_KEY;
```

In C#/.NET:
```csharp
var jwtSecret = Configuration["JWT:SecretKey"];
```

## 🔐 Secret Types

### 1. JWT Secrets
- Minimum 32 characters
- Use cryptographically random strings
- Different for development and production

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. M-Pesa Credentials
- Consumer Key: From Safaricom Daraja Portal
- Consumer Secret: From Safaricom Daraja Portal
- Pass Key: Provided by Safaricom
- Never use production keys in development

### 3. Payment Gateway Keys
- PayPal: Use sandbox mode in development
- Stripe: Use test keys (pk_test_* and sk_test_*)
- Paystack: Use test keys in development

### 4. Database Credentials
- Never hardcode connection strings
- Use environment variables
- Rotate passwords regularly

### 5. Email/SMTP Credentials
- Use app-specific passwords (Gmail)
- Never use personal email passwords
- Consider using services like SendGrid or Mailgun for production

## 📋 Development vs Production

### Development
- Use `.env` file locally
- Use test/sandbox credentials
- Can use weaker secrets for local testing (but still follow best practices)

### Production
- Use secure secret management (e.g., Azure Key Vault, AWS Secrets Manager, Heroku Config Vars)
- Strong, randomly generated secrets
- Production API keys only
- Enable all security features (HTTPS, secure cookies, etc.)

## 🔍 Checking for Exposed Secrets

Before committing code:

1. Check for hardcoded secrets:
   ```bash
   git diff | grep -i "password\|secret\|key\|token"
   ```

2. Review changed files:
   ```bash
   git status
   git diff
   ```

3. Use tools like:
   - `git-secrets`
   - `trufflehog`
   - GitHub Secret Scanning (enabled for this repository)

## 🚨 If a Secret is Exposed

If you accidentally commit a secret:

1. **Immediately rotate the secret** - Generate a new one and update your services
2. **Don't just delete it from the latest commit** - It's still in git history
3. Contact your team lead or security team
4. Consider using `git filter-branch` or `BFG Repo-Cleaner` to remove from history
5. Force push carefully (coordinate with team)

## 📝 Secret Rotation

Rotate secrets regularly:
- Production secrets: Every 90 days
- After team member departure
- After suspected compromise
- After major security incidents

## 🔗 Resources

- [Safaricom Daraja Portal](https://developer.safaricom.co.ke)
- [OWASP Secret Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)

## ✅ Checklist for New Secrets

When adding a new secret:
- [ ] Added to `.env.example` with placeholder
- [ ] Added to `.gitignore` if it's a file
- [ ] Documented in this guide
- [ ] Set up in production environment
- [ ] Different values for dev/staging/prod
- [ ] Team members notified
- [ ] Access restricted to necessary personnel only

## 🛡️ Best Practices

1. **Principle of Least Privilege** - Only give access to those who need it
2. **Separation of Concerns** - Different secrets for different environments
3. **Encryption** - Encrypt secrets at rest and in transit
4. **Monitoring** - Monitor secret access and usage
5. **Documentation** - Keep this guide updated

## 📞 Support

If you have questions about secret management, contact:
- Security Team: security@smartinvest.com
- DevOps Team: devops@smartinvest.com

---

**Last Updated:** 2024
**Version:** 1.0.0
