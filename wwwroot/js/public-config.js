// public-config.js
// Fetches /api/public-config and exposes a helper to populate elements
(async function () {
  async function fetchConfig() {
    try {
      const res = await fetch('/api/public-config');
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  const cfg = await fetchConfig();
  if (!cfg) return;

  function setIfPresent(selectorOrId, value, isMail = false) {
    if (!value) return;
    const el = document.getElementById(selectorOrId) || document.querySelector(selectorOrId);
    if (!el) return;
    if (isMail) {
      el.textContent = value;
      if (el.tagName === 'A') el.href = 'mailto:' + value;
    } else {
      el.textContent = value;
      if (el.tagName === 'A' && value.includes('@')) el.href = 'mailto:' + value;
    }
  }

  // Common keys
  setIfPresent('contactSupportEmail', cfg.supportEmail, true);
  setIfPresent('contactPartnerEmail', cfg.partnerEmail, true);
  setIfPresent('contactSupportPhone', cfg.supportPhone, false);
  setIfPresent('privacyEmailLink', cfg.supportEmail || cfg.adminEmail, true);
  setIfPresent('dpoEmail', cfg.supportEmail || cfg.adminEmail, true);

  // Footer consolidation: elements with data-config attribute
  document.querySelectorAll('[data-config]').forEach(el => {
    const key = el.getAttribute('data-config');
    if (!key) return;
    const v = key.split('.').reduce((acc, k) => acc && acc[k], cfg);
    if (!v) return;
    if (el.tagName === 'A') {
      el.textContent = v;
      el.href = v.includes('@') ? 'mailto:' + v : v;
    } else {
      el.textContent = v;
    }
  });

  // Expose for debugging (readonly)
  window.__PUBLIC_CONFIG = Object.freeze(cfg);
})();
