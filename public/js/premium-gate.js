(function(){
  const sameOrigin = url => {
    try { const u = new URL(url, location.href); return u.origin === location.origin; } catch { return false; }
  };

  let premiumCache = null; // true|false|null
  async function fetchPremiumStatus() {
    if (premiumCache !== null) return premiumCache;
    const tryEndpoints = [
      '/api/user',
      '/api/me',
      '/api/profile',
    ];
    for (const ep of tryEndpoints) {
      try {
        const res = await fetch(ep, { credentials: 'include' });
        if (!res.ok) continue;
        const data = await res.json().catch(() => ({}));
        // Accept a few common shapes
        if (typeof data.premium === 'boolean') { premiumCache = data.premium; return premiumCache; }
        if (data.user && typeof data.user.premium === 'boolean') { premiumCache = data.user.premium; return premiumCache; }
        if (data.account && typeof data.account.premium === 'boolean') { premiumCache = data.account.premium; return premiumCache; }
      } catch {}
    }
    premiumCache = false; // default to not premium if unknown
    return premiumCache;
  }

  function isException(href) {
    if (!href) return false;
    // Allow pricing/upgrade pages, auth, tel/mailto, and admin
    if (/^mailto:|^tel:/i.test(href)) return true;
    const u = new URL(href, location.href);
    const path = u.pathname;
    if (/\/pricing|\/upgrade|\/premium|\/login|\/signin|\/auth|\/subscribe/.test(path)) return true;
    if (/\/admin/.test(path)) return true; // admin left untouched
    return false;
  }

  function shouldGateAnchor(a) {
    if (!a || a.dataset.free === 'true') return false; // explicit opt-out
    const href = a.getAttribute('href');
    if (!href || href === '#' || href.startsWith('#')) return false;
    if (!sameOrigin(href)) return false; // don't gate external
    if (isException(href)) return false;
    return true;
  }

  async function handleAnchorClick(e) {
    const a = e.target.closest('a');
    if (!a || !shouldGateAnchor(a)) return;

    e.preventDefault();
    const targetUrl = a.href;

    try {
      const isPremium = await fetchPremiumStatus();
      if (isPremium) {
        // proceed
        if (a.target === '_blank' || e.ctrlKey || e.metaKey) {
          window.open(targetUrl, '_blank');
        } else {
          location.href = targetUrl;
        }
      } else {
        // redirect to upgrade/pricing
        const upgrade = '/pricing';
        const fallback = '/?premium=upgrade';
        location.href = upgrade;
        setTimeout(() => { if (location.pathname !== '/pricing') location.href = fallback; }, 1200);
      }
    } catch {
      // on error, be conservative and send to pricing
      location.href = '/pricing';
    }
  }

  // Attach once DOM is ready
  document.addEventListener('click', handleAnchorClick, true);
})();