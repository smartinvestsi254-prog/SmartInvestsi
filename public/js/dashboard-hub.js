'use strict';

const dashboardHubState = {
  catalog: [],
  library: [],
  activity: [],
  adminBootstrapped: false,
  currentRole: 'user'
};

const LIBRARY_KEY = 'si_library';
const ACTIVITY_KEY = 'si_activity';
const PREMIUM_KEY = 'si_is_premium';
const LAST_LOGIN_KEY = 'si_last_login';

function safeGet(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (e) {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {}
}

function hydrateDashboardState() {
  dashboardHubState.library = readStoredArray(LIBRARY_KEY);
  dashboardHubState.activity = readStoredArray(ACTIVITY_KEY);
}

function readStoredArray(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function persistLibrary() {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(dashboardHubState.library));
  } catch (e) {}
}

function persistActivity() {
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(dashboardHubState.activity));
  } catch (e) {}
}

function updateUserBadge() {
  const email = safeGet('si_user_email');
  const badge = document.getElementById('userBadge');
  if (email && badge) {
    badge.textContent = `Logged in: ${email}`;
    badge.classList.remove('hidden');
  }
}

let loading = false;

function scrollToSection(sectionId) {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
}

function storeLoginMetadata(email, isPremiumFlag) {
  if (email) {
    safeSet('si_user_email', email.toLowerCase());
  }
  safeSet(PREMIUM_KEY, isPremiumFlag ? 'true' : 'false');
  const now = new Date().toISOString();
  safeSet(LAST_LOGIN_KEY, now);
  renderUserDashboardStats();
  updateUserBadge();
}

function logUserActivity(action, detail) {
  if (!action && !detail) return;
  const entry = { action, detail, at: new Date().toISOString() };
  dashboardHubState.activity = [entry, ...dashboardHubState.activity].slice(0, 8);
  persistActivity();
  renderUserActivity();
}

function renderUserActivity() {
  const container = document.getElementById('userActivityFeed');
  if (!container) return;
  if (!dashboardHubState.activity.length) {
    container.innerHTML = '<div class="text-slate-500">No activity logged yet.</div>';
    return;
  }
  container.innerHTML = dashboardHubState.activity.map(item => `
    <div class="border border-slate-100 rounded-lg p-3">
      <div class="text-xs uppercase text-slate-400">${item.action || 'Update'}</div>
      <div class="text-sm text-slate-700">${item.detail || ''}</div>
      <div class="text-xs text-slate-500 mt-1">${formatDateForHumans(item.at)}</div>
    </div>
  `).join('');
}

function resetUserActivity() {
  dashboardHubState.activity = [];
  persistActivity();
  renderUserActivity();
}

function renderUserDashboardStats() {
  const emailEl = document.getElementById('userDashboardEmail');
  const premiumStatusEl = document.getElementById('userPremiumStatus');
  const premiumBadgeEl = document.getElementById('userPremiumBadge');
  const premiumMessageEl = document.getElementById('userPremiumMessage');
  const libraryCountEl = document.getElementById('userLibraryStat');
  const lastActiveEl = document.getElementById('userLastActive');

  const email = safeGet('si_user_email', 'Not signed in yet');
  const isPremium = safeGet(PREMIUM_KEY) === 'true';
  const lastLogin = safeGet(LAST_LOGIN_KEY);
  const libraryCount = dashboardHubState.library.length;

  if (emailEl) emailEl.textContent = email;
  if (premiumStatusEl) premiumStatusEl.textContent = isPremium ? 'Premium' : 'Free tier';
  if (premiumBadgeEl) {
    premiumBadgeEl.textContent = isPremium ? 'Active' : 'Inactive';
    premiumBadgeEl.className = isPremium
      ? 'px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700'
      : 'px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600';
  }
  if (premiumMessageEl) {
    premiumMessageEl.textContent = isPremium
      ? 'Thank you for supporting SmartInvest — VIP webinars are unlocked.'
      : 'Upgrade to unlock VIP webinars and advanced tooling.';
  }
  if (libraryCountEl) libraryCountEl.textContent = libraryCount;
  if (lastActiveEl) lastActiveEl.textContent = lastLogin ? formatDateForHumans(lastLogin) : '—';
}

function recordLibraryEntry(fileId, options = {}) {
  if (!fileId) return;
  const match = dashboardHubState.catalog.find(f => f.id === fileId);
  const entry = {
    id: fileId,
    title: options.title || match?.title || 'Premium Asset',
    price: options.price ?? match?.price ?? 0,
    method: options.method || 'mpesa',
    purchasedAt: new Date().toISOString()
  };
  dashboardHubState.library = [entry, ...dashboardHubState.library].slice(0, 6);
  persistLibrary();
  renderUserLibrary();
}

function renderUserLibrary() {
  const list = document.getElementById('userLibraryList');
  const badge = document.getElementById('userLibraryCount');
  const stat = document.getElementById('userLibraryStat');
  if (!list) return;

  const items = dashboardHubState.library;
  if (badge) badge.textContent = `${items.length} ${items.length === 1 ? 'file' : 'files'}`;
  if (stat) stat.textContent = items.length;

  if (!items.length) {
    const suggestions = dashboardHubState.catalog.slice(0, 3).map(item => `
      <div class="border border-slate-100 rounded-lg p-3">
        <div class="font-semibold text-slate-900">${escapeHtml(item.title || 'Premium File')}</div>
        <div class="text-xs text-slate-500">${escapeHtml(item.description || 'Access available after purchase')}</div>
      </div>
    `).join('');
    list.innerHTML = suggestions || '<div class="text-slate-500">No purchases yet. Explore the catalog to get started.</div>';
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="border border-slate-100 rounded-lg p-3">
      <div class="flex items-center justify-between">
        <div class="font-semibold text-slate-900">${escapeHtml(item.title)}</div>
        <span class="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">${escapeHtml((item.method || 'mpesa').toUpperCase())}</span>
      </div>
      <div class="text-xs text-slate-500">${formatDateForHumans(item.purchasedAt)} • ${item.price ? '$' + item.price : 'Included'}</div>
    </div>
  `).join('');
}

function formatDateForHumans(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch (e) {
    return value;
  }
}

function initDashboardHub() {
  document.querySelectorAll('[data-dashboard-role]').forEach(btn => {
    btn.addEventListener('click', () => activateDashboardRole(btn.dataset.dashboardRole));
  });
  const syncButton = document.getElementById('userSyncButton');
  if (syncButton) {
    syncButton.addEventListener('click', () => {
      renderUserDashboardStats();
      renderUserLibrary();
      renderUserActivity();
    });
  }
}

function activateDashboardRole(role) {
  if (!role) return;
  dashboardHubState.currentRole = role;
  document.querySelectorAll('[data-dashboard-role]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.dashboardRole === role);
  });
  document.querySelectorAll('[data-dashboard-panel]').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.dashboardPanel === role);
  });
  if (role === 'admin') {
    ensureAdminPanelBootstrapped();
  }
}

function ensureAdminPanelBootstrapped() {
  if (dashboardHubState.adminBootstrapped) return;
  dashboardHubState.adminBootstrapped = true;
  refreshDashboard();
}

function detectInitialDashboardRole() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('dashboard');
  const role = requested === 'admin' ? 'admin' : 'user';
  activateDashboardRole(role);
  if (role === 'admin') {
    scrollToSection('dashboard-hub');
  }
}

async function handleMpesaPay() {
  if (loading) return;
  const btn = document.getElementById('mpesaBtn');
  const msgDiv = document.getElementById('paymentMessage');
  if (!btn || !msgDiv) return;
  loading = true;
  btn.disabled = true;
  btn.textContent = 'Processing...';
  msgDiv.textContent = '';

  try {
    const phone = btn.dataset.phone || '254114383762';
    const res = await fetch('/api/pay/mpesa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1000, phone })
    });
    const data = await res.json();
    const success = Boolean(data && data.success);
    msgDiv.textContent = success ? 'M-Pesa STK Push sent. Complete payment on your phone.' : 'M-Pesa payment failed.';
    msgDiv.className = success ? 'mt-4 text-sm text-green-300' : 'mt-4 text-sm text-red-300';
    if (success) {
      recordLibraryEntry('premium-pass', { title: 'Premium Access', price: 1000, method: 'mpesa' });
      logUserActivity('Payment', 'Started premium M-Pesa STK push');
    } else {
      logUserActivity('Payment', 'M-Pesa attempt failed');
    }
  } catch (error) {
    msgDiv.textContent = 'Network error. Please try again.';
    msgDiv.className = 'mt-4 text-sm text-red-300';
    logUserActivity('Payment', 'M-Pesa network error');
  } finally {
    loading = false;
    btn.disabled = false;
    btn.textContent = 'Pay with M-Pesa';
  }
}

async function handleBuyMpesa(fileId) {
  if (loading) return;
  const btn = document.getElementById('mpesaBtn');
  const msgDiv = document.getElementById('paymentMessage');
  if (!btn || !msgDiv) return;
  loading = true;
  btn.disabled = true;
  btn.textContent = 'Processing...';
  msgDiv.textContent = '';

  try {
    const phone = btn.dataset.phone || '254114383762';
    const res = await fetch('/api/pay/mpesa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1000, phone, accountReference: fileId })
    });
    const data = await res.json();
    const success = Boolean(data && data.success);
    msgDiv.textContent = success ? 'M-Pesa STK Push sent. Complete payment on your phone.' : 'M-Pesa payment failed.';
    msgDiv.className = success ? 'mt-4 text-sm text-green-300' : 'mt-4 text-sm text-red-300';
    if (success) {
      const match = dashboardHubState.catalog.find(f => f.id === fileId);
      recordLibraryEntry(fileId || `mpesa-${Date.now()}`, { method: 'mpesa', title: match?.title });
      logUserActivity('Payment', `Triggered M-Pesa for ${match?.title || 'catalog item'}`);
    } else {
      logUserActivity('Payment', 'Catalog M-Pesa attempt failed');
    }
  } catch (error) {
    msgDiv.textContent = 'Network error. Please try again.';
    msgDiv.className = 'mt-4 text-sm text-red-300';
    logUserActivity('Payment', 'Catalog M-Pesa network error');
  } finally {
    loading = false;
    btn.disabled = false;
    btn.textContent = 'Pay with M-Pesa';
  }
}

async function handlePayPalPay() {
  if (loading) return;
  const btn = document.getElementById('paypalBtn');
  const msgDiv = document.getElementById('paymentMessage');
  if (!btn || !msgDiv) return;
  loading = true;
  btn.disabled = true;
  btn.textContent = 'Processing...';
  msgDiv.textContent = '';

  try {
    const res = await fetch('/api/pay/paypal/create-order', {
      method: 'POST'
    });
    const data = await res.json();
    if (data?.approveUrl) {
      logUserActivity('Payment', 'Redirecting to PayPal checkout');
      window.location.href = data.approveUrl;
    } else {
      msgDiv.textContent = 'PayPal order creation failed.';
      msgDiv.className = 'mt-4 text-sm text-red-300';
      logUserActivity('Payment', 'PayPal order creation failed');
    }
  } catch (error) {
    msgDiv.textContent = 'Network error. Please try again.';
    msgDiv.className = 'mt-4 text-sm text-red-300';
    logUserActivity('Payment', 'PayPal network error');
  } finally {
    loading = false;
    btn.disabled = false;
    btn.textContent = 'Pay with PayPal';
  }
}

async function handleBuyPaypal(fileId, amount) {
  if (loading) return;
  const btn = document.getElementById('paypalBtn');
  const msgDiv = document.getElementById('paymentMessage');
  if (!btn || !msgDiv) return;
  loading = true;
  btn.disabled = true;
  btn.textContent = 'Processing...';
  msgDiv.textContent = '';

  try {
    const res = await fetch('/api/pay/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amount || 10, fileId })
    });
    const data = await res.json();
    if (data?.approveUrl) {
      const match = dashboardHubState.catalog.find(f => f.id === fileId);
      logUserActivity('Payment', `Redirecting to PayPal for ${match?.title || 'catalog item'}`);
      window.location.href = data.approveUrl;
    } else {
      msgDiv.textContent = 'PayPal order creation failed.';
      msgDiv.className = 'mt-4 text-sm text-red-300';
      logUserActivity('Payment', 'PayPal order creation failed');
    }
  } catch (error) {
    msgDiv.textContent = 'Network error. Please try again.';
    msgDiv.className = 'mt-4 text-sm text-red-300';
    logUserActivity('Payment', 'PayPal network error');
  } finally {
    loading = false;
    btn.disabled = false;
    btn.textContent = 'Pay with PayPal';
  }
}

function toggleBankForm(show) {
  const el = document.getElementById('bankForm');
  if (!el) return;
  el.style.display = show ? 'block' : 'none';
  const msgDiv = document.getElementById('paymentMessage');
  if (msgDiv) msgDiv.textContent = '';
}

async function submitBankTransfer(event) {
  event.preventDefault();
  const name = document.getElementById('bankName').value;
  const email = document.getElementById('bankEmail').value;
  const amount = document.getElementById('bankAmount').value;
  const reference = document.getElementById('bankReference').value;
  const msgDiv = document.getElementById('bankInstructions');
  msgDiv.textContent = 'Recording transfer...';
  try {
    const res = await fetch('/api/pay/kcb/manual', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, amount, reference })
    });
    const data = await res.json();
    if (data.success && data.transaction) {
      const acc = data.transaction.account;
      msgDiv.innerHTML = `<div>Please pay <strong>KES ${data.transaction.amount}</strong> to:</div>
        <div class="mt-2"><strong>${acc.bank}</strong> — ${acc.accountName}</div>
        <div>${acc.accountNumber}</div>
        <div class="mt-2 text-sm text-gray-600">Use reference: <strong>${data.transaction.reference || data.transaction.timestamp}</strong></div>
        <div class="mt-2 text-sm text-gray-600">After sending funds, email a proof to <strong>${data.transaction.email}</strong> with the reference.</div>`;
      document.getElementById('bankForm').style.display = 'block';
      logUserActivity('Bank transfer', `Manual KCB transfer recorded for ${amount} KES`);
    } else {
      msgDiv.textContent = 'Failed to record transfer. Try again.';
      logUserActivity('Bank transfer', 'Failed to record manual transfer');
    }
  } catch (err) {
    msgDiv.textContent = 'Network error. Please try again.';
    logUserActivity('Bank transfer', 'Network error while recording transfer');
  }
}

function openBankForFile(fileId) {
  toggleBankForm(true);
  document.getElementById('bankReference').value = fileId;
}

function handleContactSubmit(event) {
  event.preventDefault();
  alert('Thank you for your message! We will get back to you soon.');
  event.target.reset();
}

function demoLogin(event) {
  event.preventDefault();
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  if (!emailInput || !passwordInput) return;
  const email = emailInput.value;

  fetch('/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: passwordInput.value })
  }).then(r => r.json()).then(data => {
    if (data.success) {
      alert('Sign in successful');
      const isPremium = Boolean(data.isPremium || data.user?.isPremium || data.profile?.isPremium);
      storeLoginMetadata(email, isPremium);
      logUserActivity('Login', `Signed in as ${email}`);
      renderUserLibrary();
    } else {
      alert('Sign in failed: ' + (data.error || ''));
    }
  }).catch(() => {
    alert('Network error');
  }).finally(() => {
    event.target.reset();
  });
}

async function handleSignup(event) {
  event.preventDefault();
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const acceptTerms = document.getElementById('acceptTerms').checked;
  try {
    const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, acceptTerms }) });
    const data = await res.json();
    if (data.success) {
      alert('Signup successful — you can now sign in.');
      storeLoginMetadata(email, false);
      logUserActivity('Signup', 'Created SmartInvest account');
      event.target.reset();
    } else {
      alert('Signup failed: ' + (data.error || ''));
    }
  } catch (err) {
    alert('Network error');
  }
}

async function fetchCatalog() {
  try {
    const res = await fetch('/api/catalog');
    const data = await res.json();
    const el = document.getElementById('catalog');
    if (!data.success || !Array.isArray(data.files)) {
      if (el) el.innerHTML = '<div class="col-span-3 text-center text-red-500">Failed to load catalog.</div>';
      return;
    }
    dashboardHubState.catalog = data.files;
    renderUserLibrary();
    if (!el) return;
    if (data.files.length === 0) {
      el.innerHTML = '<div class="col-span-3 text-center text-gray-500">No files available.</div>';
      return;
    }
    el.innerHTML = '';
    data.files.forEach(f => {
      const card = document.createElement('div');
      card.className = 'bg-white border border-gray-200 rounded-lg p-6 shadow-sm';
      card.innerHTML = `<h3 class="text-xl font-bold mb-2 text-purple-600">${escapeHtml(f.title)}</h3>
        <p class="text-gray-600 mb-3">${escapeHtml(f.description || '')}</p>
        <div class="mb-4 font-semibold">Price: ${escapeHtml(String(f.price || 0))} USD</div>
        <div class="flex gap-2">
          <button class="flex-1 bg-blue-500 text-white px-4 py-2 rounded" onclick="handleBuyPaypal('${f.id}', ${Number(f.price || 10)})">Buy with PayPal</button>
          <button class="bg-green-500 text-white px-4 py-2 rounded" onclick="handleBuyMpesa('${f.id}')">Pay M-Pesa</button>
          <button class="bg-gray-800 text-white px-4 py-2 rounded" onclick="openBankForFile('${f.id}')">Bank</button>
        </div>`;
      el.appendChild(card);
    });
  } catch (e) {
    const el = document.getElementById('catalog');
    if (el) el.innerHTML = '<div class="col-span-3 text-center text-red-500">Error loading catalog.</div>';
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"'`]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;","`":"&#96;"}[c]; });
}

async function requestDownloadToken(fileId) {
  const email = safeGet('si_user_email');
  const body = { fileId, email };
  const headers = { 'Content-Type': 'application/json' };
  if (email) headers['x-user-email'] = email;
  const res = await fetch('/api/download/request', { method: 'POST', headers, body: JSON.stringify(body) });
  return res.json();
}
async function loadPaymentsLedger() {
  const list = document.getElementById('paymentsLedger');
  if (!list) return;
  list.innerHTML = '<div class="text-gray-500">Loading ledger...</div>';

  try {
    const res = await fetch('/api/admin/payments');
    const data = await res.json();

    if (!data.success) {
      list.innerHTML = '<div class="text-red-600">Error loading payments ledger.</div>';
      return;
    }

    if (!data.payments?.length) {
      list.innerHTML = '<div class="text-gray-600">No payments recorded yet.</div>';
      return;
    }

    list.innerHTML = data.payments.map(p => `
      <div class="bg-white border rounded p-3 mb-2">
        <div class="flex justify-between items-start">
          <div>
            <div class="text-xs uppercase tracking-wide text-gray-500">${p.provider || 'gateway'}</div>
            <div class="font-semibold">${p.amount ? p.amount : 'N/A'} ${p.currency || ''}</div>
            <div class="text-xs text-gray-600">${p.fileTitle ? 'File: ' + p.fileTitle : ''}</div>
          </div>
          <div class="text-right">
            <span class="text-xs px-2 py-1 rounded bg-${p.status === 'success' || p.status === 'paid' ? 'green' : p.status === 'pending' ? 'yellow' : 'red'}-100">${p.status || 'pending'}</span><br>
            <small class="text-gray-500">${p.createdAt || ''}</small>
          </div>
        </div>
        <div class="text-xs text-gray-700 mt-2">User: ${p.email || 'N/A'} ${p.phone ? '(' + p.phone + ')' : ''}</div>
        <div class="text-xs text-gray-600">Reference: ${p.reference || 'N/A'} ${p.receipt ? ' • Receipt: ' + p.receipt : ''}</div>
        ${p.note ? `<div class="text-xs text-gray-600">Note: ${p.note}</div>` : ''}
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = '<div class="text-red-600">Error loading payments</div>';
  }
}

function switchTab(evt, tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn === evt?.currentTarget);
  });
  document.querySelectorAll('.tab-content').forEach(panel => {
    panel.classList.toggle('active', panel.id === tabName);
  });

  switch (tabName) {
    case 'dashboard':
      refreshDashboard();
      break;
    case 'users':
      loadAllUsers();
      loadActiveSessions();
      break;
    case 'files':
      loadFiles();
      break;
    case 'messages':
      loadMessages();
      break;
    case 'payments':
      loadPaymentsLedger();
      loadKCBTransfers();
      break;
    default:
      break;
  }
}

async function refreshDashboard() {
  const usersEl = document.getElementById('stat-users');
  const premiumEl = document.getElementById('stat-premium');
  const filesEl = document.getElementById('stat-files');
  const messagesEl = document.getElementById('stat-messages');
  if (!usersEl || !premiumEl || !filesEl || !messagesEl) return;

  usersEl.textContent = premiumEl.textContent = filesEl.textContent = messagesEl.textContent = '…';

  try {
    const res = await fetch('/api/admin/dashboard-stats');
    const data = await res.json();
    if (!data.success) throw new Error('Failed to load stats');
    usersEl.textContent = data.totalUsers ?? '0';
    premiumEl.textContent = data.premiumUsers ?? '0';
    filesEl.textContent = data.totalFiles ?? '0';
    messagesEl.textContent = data.pendingMessages ?? '0';
  } catch (e) {
    usersEl.textContent = premiumEl.textContent = filesEl.textContent = messagesEl.textContent = 'Error';
  }
}

function renderUsersList(users) {
  return users.map(user => `
    <div class="border rounded p-3 mb-2 bg-white">
      <div class="flex justify-between">
        <div>
          <strong>${user.name || 'User'}</strong><br>
          <small class="text-gray-600">${user.email || '—'}</small>
        </div>
        <div class="text-right text-xs text-gray-500">
          ${user.createdAt ? formatDateForHumans(user.createdAt) : ''}<br>
          ${user.isPremium ? '<span class="text-green-600 font-semibold">Premium</span>' : ''}
        </div>
      </div>
      <div class="text-xs text-gray-600 mt-2">Spent: ${user.totalSpent ? '$' + user.totalSpent : '—'}</div>
    </div>
  `).join('');
}

async function loadAllUsers(query = '') {
  const list = document.getElementById('usersList');
  if (!list) return;
  list.innerHTML = '<div class="text-gray-500">Loading users...</div>';

  try {
    const url = query ? `/api/admin/users?query=${encodeURIComponent(query)}` : '/api/admin/users';
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success || !data.users?.length) {
      list.innerHTML = '<div class="text-gray-600">No users found.</div>';
      return;
    }

    list.innerHTML = renderUsersList(data.users);
  } catch (e) {
    list.innerHTML = '<div class="text-red-600">Error loading users.</div>';
  }
}

async function searchUsers() {
  const input = document.getElementById('userSearch');
  const term = input?.value.trim();
  if (!term) {
    loadAllUsers();
    return;
  }
  loadAllUsers(term);
}

async function loadActiveSessions() {
  const list = document.getElementById('sessionsList');
  if (!list) return;
  list.innerHTML = '<div class="text-gray-500">Loading sessions...</div>';

  try {
    const res = await fetch('/api/admin/sessions');
    const data = await res.json();
    if (!data.success || !data.sessions?.length) {
      list.innerHTML = '<div class="text-gray-600">No active sessions.</div>';
      return;
    }
    list.innerHTML = data.sessions.map(session => `
      <div class="border rounded p-2 mb-2 text-sm">
        <div class="flex justify-between">
          <div>${session.email || '—'}</div>
          <div class="text-gray-500">${formatDateForHumans(session.lastSeen)}</div>
        </div>
        <div class="text-xs text-gray-500">IP: ${session.ip || 'n/a'} • Agent: ${session.agent || 'n/a'}</div>
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = '<div class="text-red-600">Error loading sessions.</div>';
  }
}

async function uploadFile(event) {
  event?.preventDefault();
  const fileInput = document.getElementById('fileInput');
  const status = document.getElementById('uploadStatus');
  if (!fileInput || !fileInput.files?.length) {
    if (status) {
      status.textContent = 'Choose a file before uploading.';
      status.className = 'text-sm text-red-600';
    }
    return;
  }

  const formData = new FormData();
  formData.append('title', document.getElementById('fileTitle')?.value || 'Untitled');
  formData.append('price', document.getElementById('filePrice')?.value || '0');
  formData.append('description', document.getElementById('fileDescription')?.value || '');
  formData.append('file', fileInput.files[0]);

  if (status) {
    status.textContent = 'Uploading…';
    status.className = 'text-sm text-gray-600';
  }

  try {
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      if (status) {
        status.textContent = '✓ File uploaded successfully';
        status.className = 'text-sm text-green-600';
      }
      document.getElementById('fileTitle').value = '';
      document.getElementById('filePrice').value = '0';
      document.getElementById('fileDescription').value = '';
      fileInput.value = '';
      loadFiles();
    } else if (status) {
      status.textContent = '✗ Upload failed: ' + (data.error || '');
      status.className = 'text-sm text-red-600';
    }
  } catch (e) {
    if (status) {
      status.textContent = '✗ Error: ' + e.message;
      status.className = 'text-sm text-red-600';
    }
  }
}

async function loadFiles() {
  const list = document.getElementById('filesList');
  if (!list) return;
  list.innerHTML = '<div class="text-gray-500">Loading files...</div>';

  try {
    const res = await fetch('/api/admin/files');
    const data = await res.json();
    if (!data.success || !data.files?.length) {
      list.innerHTML = '<div class="text-gray-600">No files uploaded.</div>';
      return;
    }
    list.innerHTML = data.files.map(f => `
      <div class="border rounded p-2 mb-2">
        <div class="flex justify-between items-start">
          <div>
            <strong>${escapeHtml(f.title || 'Untitled')}</strong><br>
            <small class="text-gray-600">Price: $${f.price ?? 0}</small><br>
            <small class="text-xs text-gray-500">${escapeHtml(f.originalName || '')}</small>
          </div>
          <div class="space-x-1">
            <button onclick="togglePublish('${f.id}', ${f.published ? 'true' : 'false'})" class="bg-gray-500 text-white px-2 py-1 rounded text-xs">${f.published ? 'Unpublish' : 'Publish'}</button>
            <button onclick="deleteFile('${f.id}')" class="bg-red-600 text-white px-2 py-1 rounded text-xs">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = '<div class="text-red-600">Error loading files.</div>';
  }
}

async function togglePublish(id, current) {
  try {
    const res = await fetch(`/api/admin/files/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !current })
    });
    const data = await res.json();
    if (data.success) loadFiles();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function deleteFile(id) {
  if (!confirm('Delete this file?')) return;
  try {
    const res = await fetch(`/api/admin/files/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      loadFiles();
    } else {
      alert('Error: ' + (data.error || 'Failed'));
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

function exportFilesList() {
  alert('Export functionality coming soon.');
}

async function loadMessages() {
  const list = document.getElementById('messagesList');
  if (!list) return;
  list.innerHTML = '<div class="text-gray-500">Loading messages...</div>';

  try {
    const res = await fetch('/api/admin/messages');
    const data = await res.json();
    if (!data.success || !data.messages?.length) {
      list.innerHTML = '<div class="text-gray-600">No messages.</div>';
      return;
    }
    list.innerHTML = data.messages.map(m => `
      <div class="border rounded p-3 bg-gray-50 mb-3">
        <div class="flex justify-between">
          <div>
            <strong>${escapeHtml(m.name || 'User')}</strong><br>
            <small class="text-gray-600">${escapeHtml(m.email || '')}</small>
          </div>
          <small class="text-gray-500">${formatDateForHumans(m.createdAt)}</small>
        </div>
        <div class="mt-2 text-sm">${escapeHtml(m.message || '')}</div>
        ${(m.replies || []).map(r => `
          <div class="mt-2 p-2 bg-white border-l-4 border-blue-600">
            <strong class="text-blue-600">Admin Reply:</strong><br>
            <small class="text-gray-500">${formatDateForHumans(r.at)}</small>
            <div class="text-sm mt-1">${escapeHtml(r.message || '')}</div>
          </div>
        `).join('')}
        <div class="mt-2 flex gap-2">
          <input id="reply_${m.id}" type="text" placeholder="Your reply..." class="flex-1 border rounded p-2 text-sm">
          <button onclick="replyMessage('${m.id}')" class="bg-blue-600 text-white px-3 py-1 rounded text-sm">Reply</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = '<div class="text-red-600">Error loading messages.</div>';
  }
}

async function replyMessage(id) {
  const input = document.getElementById(`reply_${id}`);
  const text = input?.value.trim();
  if (!text) return alert('Enter a reply');
  try {
    const res = await fetch(`/api/admin/messages/${id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: text })
    });
    const data = await res.json();
    if (data.success) {
      input.value = '';
      loadMessages();
    } else {
      alert('Error: ' + (data.error || 'Failed'));
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

function refreshMessages() {
  loadMessages();
}

async function loadKCBTransfers() {
  const list = document.getElementById('kcbTransfersList');
  if (!list) return;
  list.innerHTML = '<div class="text-gray-500">Loading transfers...</div>';

  try {
    const res = await fetch('/api/admin/kcb-transfers');
    const data = await res.json();
    if (!data.success || !data.transfers?.length) {
      list.innerHTML = '<div class="text-gray-600">No transfers found.</div>';
      return;
    }
    list.innerHTML = data.transfers.map(t => `
      <div class="border rounded p-2 mb-2 text-sm">
        <div class="flex justify-between">
          <div>
            <strong>${escapeHtml(t.name || 'Customer')}</strong> (${escapeHtml(t.email || 'n/a')})<br>
            <small class="text-gray-600">KES ${t.amount} - Ref: ${escapeHtml(t.reference || 'N/A')}</small>
          </div>
          <div class="text-right">
            <span class="text-xs bg-${t.status === 'paid' ? 'green' : 'yellow'}-100 px-2 py-1 rounded">${t.status || 'pending'}</span><br>
            <small class="text-gray-500">${formatDateForHumans(t.timestamp)}</small>
          </div>
        </div>
        ${t.status !== 'paid' ? `<button onclick="markPaid('${t.timestamp}')" class="mt-1 bg-green-600 text-white px-2 py-1 rounded text-xs">Mark Paid</button>` : ''}
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = '<div class="text-red-600">Error loading transfers.</div>';
  }
}

async function markPaid(ts) {
  const note = prompt('Optional note for this transfer:');
  try {
    const res = await fetch('/api/admin/kcb/mark-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp: ts, note })
    });
    const data = await res.json();
    if (data.success) {
      loadKCBTransfers();
    } else {
      alert('Error: ' + (data.error || 'Failed'));
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function exportKCBCSV() {
  try {
    const res = await fetch('/api/admin/kcb-export');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kcb-transfers.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Export failed: ' + e.message);
  }
}

async function reconcileBankEntries() {
  const textarea = document.getElementById('reconcileData');
  const result = document.getElementById('reconcileResult');
  if (!textarea) return;
  const raw = textarea.value.trim();
  if (!raw) return alert('Paste JSON array');

  let entries;
  try {
    entries = JSON.parse(raw);
  } catch (e) {
    alert('Invalid JSON: ' + e.message);
    return;
  }

  try {
    const res = await fetch('/api/admin/kcb/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries })
    });
    const data = await res.json();
    if (data.success) {
      if (result) {
        result.textContent = `✓ Matched: ${data.summary?.matched ?? 0}, Unmatched: ${data.summary?.unmatched ?? 0}`;
        result.className = 'text-sm text-green-600 mt-2';
      }
      loadKCBTransfers();
    } else if (result) {
      result.textContent = '✗ Error: ' + (data.error || 'Failed');
      result.className = 'text-sm text-red-600 mt-2';
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function requestPaymentReview() {
  const input = document.getElementById('paymentId');
  const status = document.getElementById('reviewStatus');
  if (!input) return;
  const paymentId = input.value.trim();
  if (!paymentId) return alert('Enter payment ID');

  try {
    const res = await fetch('/api/admin/payment-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId })
    });
    const data = await res.json();
    if (data.success) {
      if (status) {
        status.textContent = `✓ Review requested for payment ${paymentId}`;
        status.className = 'text-sm text-green-600';
      }
      input.value = '';
    } else if (status) {
      status.textContent = '✗ Error: ' + (data.error || 'Failed');
      status.className = 'text-sm text-red-600';
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function sendEmail() {
  const to = document.getElementById('emailTo')?.value;
  const subject = document.getElementById('emailSubject')?.value;
  const body = document.getElementById('emailBody')?.value;
  const status = document.getElementById('emailStatus');
  if (!to || !subject || !body) return alert('Fill all fields');

  try {
    const res = await fetch('/api/admin/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body })
    });
    const data = await res.json();
    if (data.success) {
      if (status) {
        status.textContent = '✓ Email sent to ' + to;
        status.className = 'text-sm text-green-600';
      }
      document.getElementById('emailTo').value = '';
      document.getElementById('emailSubject').value = '';
      document.getElementById('emailBody').value = '';
    } else if (status) {
      status.textContent = '✗ Error: ' + (data.error || 'Failed');
      status.className = 'text-sm text-red-600';
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function sendBulkEmail() {
  const subject = document.getElementById('bulkSubject')?.value;
  const body = document.getElementById('bulkBody')?.value;
  const recipients = document.getElementById('bulkRecipients')?.value;
  const status = document.getElementById('bulkStatus');
  if (!subject || !body || !recipients) return alert('Fill all fields');

  try {
    const res = await fetch('/api/admin/send-bulk-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body, recipients })
    });
    const data = await res.json();
    if (data.success) {
      if (status) {
        status.textContent = `✓ Email sent to ${data.sentCount ?? 0} recipients`;
        status.className = 'text-sm text-green-600';
      }
      document.getElementById('bulkSubject').value = '';
      document.getElementById('bulkBody').value = '';
      document.getElementById('bulkRecipients').value = '';
    } else if (status) {
      status.textContent = '✗ Error: ' + (data.error || 'Failed');
      status.className = 'text-sm text-red-600';
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

window.addEventListener('load', () => {
  hydrateDashboardState();
  renderUserDashboardStats();
  renderUserLibrary();
  renderUserActivity();
  updateUserBadge();
  fetchCatalog();
  initDashboardHub();
  detectInitialDashboardRole();
});