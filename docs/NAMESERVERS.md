# Nameserver (DNS) Change — Cloudflare

This file documents the exact nameserver entries to use for the SmartInvestsi domain and gives step-by-step instructions to replace any existing nameservers at your domain registrar.

Important: I will only add this documentation to the repository. I cannot modify your registrar or Cloudflare account — someone with registrar access must make the actual change.

## Required Cloudflare nameservers

Please set your domain's nameservers to only the following two entries (delete any other nameservers listed in your registrar panel):

- arely.ns.cloudflare.com
- frank.ns.cloudflare.com

Do NOT leave any other nameservers configured. Remove any existing secondary or legacy nameserver entries.

## Step-by-step instructions (Registrar)

1. Sign in to your domain registrar (where you bought the domain).
2. Locate the domain's DNS / Nameserver settings (may be called "DNS management", "Nameservers", "Custom nameservers").
3. Replace the current nameservers with:
   - arely.ns.cloudflare.com
   - frank.ns.cloudflare.com
4. Save / apply the changes.

## Verify the change

After updating at the registrar:

- Wait for propagation (usually 5–60 minutes; can take up to 48 hours).
- Verify using one or more of these checks:

  - CLI (macOS / Linux / Windows WSL):
    - dig NS yourdomain.com +short
    - nslookup -type=NS yourdomain.com

  - Web tools:
    - https://www.whatsmydns.net (select NS)
    - https://dnschecker.org (select NS)

All results should show:
- arely.ns.cloudflare.com
- frank.ns.cloudflare.com

## Cloudflare steps (if needed)

If you haven't already added the domain to your Cloudflare account:

1. Sign in to Cloudflare.
2. Add site → follow the onboarding steps.
3. Cloudflare will scan existing records — review and confirm them.
4. When Cloudflare asks you to change nameservers, use the two Cloudflare hosts above.
5. After the registrar update, Cloudflare will indicate the domain is active once propagation completes.

## Rollback / Troubleshooting

- If any service breaks after the change, confirm that all DNS records (A, CNAME, MX, TXT, etc.) were copied into Cloudflare before switching nameservers.
- If email is affected, verify MX / SPF / DKIM / DMARC records are present in Cloudflare DNS.
- If you need me to produce a checklist of required DNS records found in this repo (A, CNAME, MX entries), I can generate that and add it to this doc.
