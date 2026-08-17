# Pull Request: docs: add Cloudflare nameservers instructions

This PR adds a new documentation file that instructs how to change the domain nameservers to the required Cloudflare hosts and how to verify DNS propagation.

Files added:
- docs/NAMESERVERS.md

Why:
- Centralizes nameserver instructions so the team and any operator can quickly apply the required Cloudflare nameservers at the registrar.

Checklist (manual verification required):
- [ ] Confirm docs/NAMESERVERS.md is correct and sufficient for your registrar.
- [ ] Merge PR to main when ready.
- [ ] After merge, update nameservers at the domain registrar to:
  - arely.ns.cloudflare.com
  - frank.ns.cloudflare.com
- [ ] Verify propagation using `dig NS yourdomain.com +short` or https://www.whatsmydns.net

Please assign a reviewer if you'd like. I recommend @delijah5415.
