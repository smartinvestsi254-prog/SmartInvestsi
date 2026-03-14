# Pre-Commit Hooks Setup Guide for SmartInvest (Fintech)

## Overview

This guide configures **pre-commit hooks** specifically for a fintech company with automatic reconciliation and comprehensive error handling.

## What Are Pre-Commit Hooks?

Pre-commit hooks automatically run checks **before** each git commit. If any check fails, the commit is blocked until issues are resolved.

## Quick Start

### 1. Install Pre-Commit Framework

**On Windows (PowerShell):**
```powershell
# Using pip
pip install pre-commit

# Or using chocolatey
choco install pre-commit
```

**On macOS/Linux:**
```bash
brew install pre-commit
# or
pip install pre-commit
```

### 2. Install Hooks into Your Repository

```bash
cd c:\Users\delij\OneDrive\Documents\GitHub\SmartInvest-
pre-commit install
```

This creates `.git/hooks/pre-commit` that will run on every commit.

### 3. Run Hooks Manually (Optional)

```bash
# Test against all files
pre-commit run --all-files

# Test only staged files (what will be committed)
pre-commit run

# Test a specific hook
pre-commit run detect-private-key --all-files
```

## Hook Categories

### 🔐 Security Hooks
- **detect-private-key**: Blocks commits of AWS keys, SSH keys, private certificates
- **detect-secrets**: Scans for hardcoded API keys, passwords, tokens using ML patterns
- **check-hardcoded-credentials**: Custom hook for fintech-specific credential patterns

### ✅ Code Quality Hooks
- **eslint**: Lints JavaScript/TypeScript; auto-fixes issues
- **prettier**: Auto-formats code for consistency
- **typescript-fixer**: Type-checks TypeScript (catches compile errors early)

### 📋 File Integrity Hooks
- **check-json**: Validates JSON syntax
- **check-yaml**: Validates YAML syntax
- **end-of-file-fixer**: Ensures files end with newline
- **trailing-whitespace**: Removes trailing spaces
- **check-added-large-files**: Prevents 500KB+ files

### 🔄 Fintech-Specific Hooks
- **verify-reconciliation-service**: Ensures `reconciliation-error-handler.ts` is present
- **verify-error-handlers**: Confirms `reportCrisis` and `sendEmail` are configured
- **verify-package-json**: Validates `package.json` structure

## Automatic Reconciliation & Error Handling

### How It Works

1. **Hourly Reconciliation** (`src/utils/reconciliation-error-handler.ts`)
   - Runs every 60 minutes automatically
   - Finds pending transactions older than 24 hours
   - Verifies status with payment providers (M-Pesa, Stripe, PayPal)
   - Updates local records to match provider status
   - Finds orphaned payments and creates missing transaction records
   - Validates account balances across all users

2. **Failed Transaction Handling**
   - Automatic retry logic with exponential backoff
   - Up to 3 retry attempts before escalation
   - Failed transactions escalated to admin for manual review

3. **Crisis Reporting** (`server.ts`)
   - Sends one-time admin email on critical errors
   - Tracks crisis state to prevent alert spam
   - Crisis types: `error`, `slow`, `authFallbackRequested`

### Pre-Commit Integration

The `verify-reconciliation-service` hook ensures:
- Reconciliation service file exists before commits
- `server.ts` actually imports and uses the service
- This prevents accidental removal of financial safety features

## Configuration Files

### `pre-commit` (Current)
- Minimal: Only detects private keys
- Use this by default

### `.pre-commit-config-fintech-strict.yaml` (Optional)
- Maximum security: All hooks enabled
- Use for production/audit-critical branches
- Rename to `pre-commit` to activate

### `.secrets.baseline`
- Baseline for `detect-secrets` tool
- Allows known false positives
- Update with: `detect-secrets scan > .secrets.baseline`

## Troubleshooting

### "pre-commit: command not found"
```powershell
# Ensure it's in PATH on Windows
RefreshEnv  # PowerShell: refresh environment variables
```

### Hook Fails on Staged Files
```bash
# See which files are problematic
pre-commit run --all-files --verbose

# Fix auto-fixable issues
pre-commit run --all-files --fix

# Then re-stage and commit
git add .
git commit -m "Fix pre-commit issues"
```

### Skip a Hook Temporarily
```bash
# Bypass all hooks (NOT recommended for production)
git commit --no-verify

# Or disable specific hook in .git/hooks/pre-commit
```

### Uninstall Hooks
```bash
pre-commit uninstall
```

## Best Practices

1. **Always run `pre-commit run --all-files` before pushing**
2. **Keep ESLint and Prettier configs in sync** with your IDE
3. **Update hook versions quarterly** for security patches
4. **Test on staging branches first** if changing configurations
5. **Monitor reconciliation logs** for transaction discrepancies
6. **Never commit with `--no-verify`** on production branches

## Integration with CI/CD

The same hooks can run in GitHub Actions/GitLab CI:

```yaml
# .github/workflows/pre-commit.yml
name: Pre-Commit Checks
on: [pull_request, push]
jobs:
  pre-commit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pre-commit/action@v3.0.0
```

## Reconciliation Monitoring

### View Hourly Reconciliation Logs
```bash
# Watch server logs for reconciliation messages
npm run dev | grep -i reconciliation

# Sample output:
# [Reconciliation] Found 3 stale pending transactions
# [Reconciliation] Updated transaction xxx to COMPLETED
```

### Manual Reconciliation Trigger
```bash
# Add endpoint to trigger on-demand
curl -X POST http://localhost:3001/api/admin/reconcile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## For CI/CD Pipelines

Update `.github/workflows/` to include:
```yaml
- name: Run Pre-Commit Checks
  run: |
    pip install pre-commit
    pre-commit run --all-files
```

## Support & Escalation

- **Reconciliation errors**: Check `logs/reconciliation.log`
- **Failed transactions**: Admin receives email with transaction ID
- **Hook failures blocking commits**: Review error message and run `pre-commit run --all-files --verbose`

---

**Next Steps:**
1. Run `pre-commit install` to activate hooks
2. Test with `pre-commit run --all-files`
3. Monitor `src/utils/reconciliation-error-handler.ts` logs
4. Review `RECONCILIATION_GUIDE.md` for financial integrity details
