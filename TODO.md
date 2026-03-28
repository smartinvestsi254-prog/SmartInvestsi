# Accessibility & PWA Audit Fixes + Pesapal Integration

## 1. Create PWA Assets [COMPLETE]
- [x] public/manifest.json (full PWA manifest with maskable icon)
- [x] public/apple-touch-icon.png (180x180)
- [x] public/icons/maskable-icon-512.png (maskable icon)

## 2. Update Core HTML Pages [COMPLETE]
- [x] index.html (manifest link, canonical, <main>, landmarks)
- [x] dashboard.html (manifest, canonical, <main>)
- [x] login.html (manifest, canonical, <main>)
- [x] signup.html (manifest, canonical, <main>)
- [x] about.html, calculator.html, marketplace.html, portfolios.html, pricing.html (canonical + manifest)

## 3. Service Worker Updates [PENDING]
- [ ] public/sw.js (installability checks, start_url)

## 4. Pesapal Integration [COMPLETE]
- [x] netlify/functions/pesapal.ts (create order handler)
- [x] public/js/modern-payment-interface.js (add Pesapal method)
- [ ] netlify/functions/createOrder.ts (unify or route to Pesapal)

## 5. Accessibility Polish [PENDING]
- [ ] ARIA labels/roles on modals/buttons if needed
- [ ] Verify tab order/focus (no changes if ok)

## 6. Testing & Verification [PENDING]
- [ ] Run axe-node accessibility audit
- [ ] Lighthouse PWA/accessibility scores
- [ ] Cross-browser test (Chrome/Firefox/Safari/Edge)
- [ ] Manual tab order/keyboard nav test
- [ ] Pesapal sandbox test (user provides keys)

