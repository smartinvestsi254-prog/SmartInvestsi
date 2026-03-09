(function(){
  function qs(s, el){ return (el||document).querySelector(s); }
  function qsp(name){ const u = new URL(window.location.href); return u.searchParams.get(name); }
  function escapeHtml(str){ return String(str||'').replace(/[&<>"]|'/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }

  function loadProfileFromStorage(){
    try {
      const raw = localStorage.getItem('si_profile_mvp');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  async function loadProfileFromApi(){
    try {
      const email = localStorage.getItem('si_user_email');
      const url = email ? `/api/profile?email=${encodeURIComponent(email)}` : '/api/profile';
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.profile) {
        localStorage.setItem('si_profile_mvp', JSON.stringify(data.profile));
      }
      return data?.profile || null;
    } catch (e) {
      return null;
    }
  }

  async function loadProfile(){
    const local = loadProfileFromStorage();
    if (local) return local;
    return await loadProfileFromApi();
  }

  function scoreItem(item, profile){
    if (!profile) return 0;
    const text = `${item.title || ''} ${item.description || ''}`.toLowerCase();
    let score = 0;

    if (profile.risk === 'low') {
      if (text.includes('risk') || text.includes('income') || text.includes('diversification')) score += 3;
      if (text.includes('portfolio') || text.includes('optimization')) score += 2;
    }

    if (profile.risk === 'medium') {
      if (text.includes('portfolio') || text.includes('market') || text.includes('analysis')) score += 2;
      if (text.includes('balanced')) score += 2;
    }

    if (profile.risk === 'high') {
      if (text.includes('crypto') || text.includes('growth') || text.includes('analysis')) score += 3;
      if (text.includes('venture') || text.includes('startup')) score += 2;
    }

    if (profile.impact && (text.includes('esg') || text.includes('green') || text.includes('sustainable'))) {
      score += 3;
    }

    return score;
  }

  async function trackEvent(event, data){
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, data, timestamp: new Date().toISOString() })
      });
    } catch (e) {}
  }

  async function renderList(){
    const listCard = qs('#list-card');
    const list = qs('#list');
    const recommendationsCard = qs('#recommendations-card');
    const recommendations = qs('#recommendations');
    if (!listCard || !list) return;
    listCard.style.display = 'block';
    list.innerHTML = 'Loading products…';
    try {
      const profile = await loadProfile();
      const res = await fetch('/api/catalog');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Unable to load catalog');
      const files = data.files || [];
      if (!files.length){ list.innerHTML = '<div class="text-gray-600">No published products yet.</div>'; return; }

      if (recommendationsCard && recommendations) {
        const scored = files
          .map(item => ({ item, score: scoreItem(item, profile) }))
          .filter(entry => entry.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        if (scored.length) {
          recommendationsCard.style.display = 'block';
          recommendations.innerHTML = scored.map(({ item }) => {
            const title = escapeHtml(item.title);
            const desc = escapeHtml(item.description || '');
            const price = Number(item.price || 0).toLocaleString();
            return `
              <article class="catalog-row" style="padding:12px 0;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
                <div>
                  <h4 style="margin:0;color:#0f172a;">${title} <span style="background:#e2e8f0;color:#1f2937;padding:2px 6px;border-radius:999px;font-size:10px;margin-left:6px;">Recommended</span></h4>
                  <p style="margin:4px 0;color:#475569;font-size:14px;">${desc}</p>
                  <span style="font-weight:600;color:#1a365d;">${price} KES</span>
                </div>
                <div>
                  <a class="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded text-sm" href="/catalog.html?id=${encodeURIComponent(item.id)}">View</a>
                </div>
              </article>`;
          }).join('');
          trackEvent('catalog_recommended_view', { count: scored.length, risk: profile?.risk || 'unknown' });
        } else {
          recommendationsCard.style.display = 'none';
        }
      }

      list.innerHTML = files.map(f => {
        const title = escapeHtml(f.title);
        const desc = escapeHtml(f.description || '');
        const price = Number(f.price || 0).toLocaleString();
        return `
          <article class="catalog-row" style="padding:12px 0;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
            <div>
              <h4 style="margin:0;color:#0f172a;">${title}</h4>
              <p style="margin:4px 0;color:#475569;font-size:14px;">${desc}</p>
              <span style="font-weight:600;color:#1a365d;">${price} KES</span>
            </div>
            <div>
              <a class="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded text-sm" href="/catalog.html?id=${encodeURIComponent(f.id)}">View</a>
            </div>
          </article>`;
      }).join('');
    } catch (e){
      list.innerHTML = `<div class="text-red-600">${escapeHtml(e.message)}</div>`;
    }
  }

  async function loadItem(){
    const id = qsp('id');
    const container = qs('#item');
    if (!id){
      if (container) container.innerHTML = '<h2 class="text-xl font-semibold text-slate-900">Select a product to view details</h2><p class="text-slate-700">Choose an item from the list below.</p>';
      renderList();
      return;
    }
    try {
      const res = await fetch(`/api/catalog/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!data.success){ throw new Error(data.error || 'Failed to load'); }
      const f = data.file;
      if (qs('#list-card')) qs('#list-card').style.display = 'none';
      container.innerHTML = `
        <h1 class="text-2xl font-semibold text-slate-900">${escapeHtml(f.title)}</h1>
        <p class="mt-2 text-slate-700">${escapeHtml(f.description||'')}</p>
        <dl class="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-600">
          <div><dt class="font-medium">Price</dt><dd>${Number(f.price||0).toLocaleString()} KES</dd></div>
          <div><dt class="font-medium">Size</dt><dd>${(f.size||0)} bytes</dd></div>
        </dl>
        <div class="mt-6 flex items-center gap-3">
          <input id="email" type="email" placeholder="you@example.com" class="border rounded px-3 py-2 w-64" />
          <button id="btnDownload" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded">Download (Premium)</button>
          <span id="status" class="text-sm text-slate-600"></span>
        </div>
      `;
      qs('#btnDownload').addEventListener('click', () => requestDownload(id));
    } catch (e){
      container.innerHTML = `<div class="text-red-600">${escapeHtml(e.message)}</div>`;
    }
  }

  async function requestDownload(fileId){
    const email = qs('#email').value.trim().toLowerCase();
    const status = qs('#status');
    if (!email){ status.textContent = 'Enter your account email.'; return; }
    status.textContent = 'Requesting download…';
    try {
      const res = await fetch('/api/download/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId, email }) });
      const data = await res.json();
      if (!res.ok || !data.success){ throw new Error(data.error || 'Failed'); }
      status.innerHTML = `<a class="text-blue-600 underline" href="${data.url}">Click here if download does not start</a>`;
      // Kick off download
      window.location.href = data.url;
    } catch (e){ status.textContent = `Denied: ${e.message}`; }
  }

  document.addEventListener('DOMContentLoaded', loadItem);
})();
