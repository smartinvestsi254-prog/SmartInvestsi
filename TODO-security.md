# Git Secrets Detection Reinstall & Security Review
Status: 🔄 In Progress

## Approved Plan Steps (from Security Review)

### 1. Reinstall/Upgrade Pre-commit Hooks ✅ Started
- [ ] Verify pre-commit installed: `pre-commit --version`
- [ ] Update hooks: `pre-commit autoupdate`
- [ ] Install: `pre-commit install`
- [ ] Test: `pre-commit run --all-files`
- [ ] Switch to strict config: Backup & copy `.pre-commit-config-fintech-strict.yaml` → `.pre-commit-config.yaml`

### 2. Refresh Secrets Baseline
- [ ] Generate new baseline: `detect-secrets scan > .secrets.baseline`
- [ ] Commit baseline

### 3. Install Gitleaks (Nano Binary Scanner)
- [ ] Download/install: `go install github.com/gitleaks/gitleaks/v8@latest`
- [ ] Add pre-commit hook for gitleaks
- [ ] Test history scan: `gitleaks detect --source .`

### 4. Update Documentation
- [ ] Update PRECOMMIT_SETUP.md (gitleaks steps)
- [ ] Update SECRET_MANAGEMENT.md (add gitleaks usage)

### 5. Full Verification
- [ ] Test fake secret commit (block & revert)
- [ ] Repo history scan clean
- [ ] No active security gaps

### 6. Completion
- [ ] Update this TODO (mark complete)
- [ ] attempt_completion

**Next Command:** Check if pre-commit is installed and no conflicts.

