// Admin Authentication Module (backend-driven)

/**
 * Headers are not strictly required since cookie carries JWT, but helper provided
 */
async function getAuthHeaders() {
  // cookie includes si_token; API will read it
  return { 'Content-Type': 'application/json' };
}

async function checkAdminStatus() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return false;
    const body = await res.json();
    return body.user?.isAdmin === true;
  } catch (e) {
    console.error('Admin check failed:', e);
    return false;
  }
}

// backend helpers
async function getFallbackStatus() {
  const res = await fetch('/api/auth/fallback', { credentials: 'include' });
  if (!res.ok) throw new Error('Unable to read fallback status');
  const body = await res.json();
  return body.enabled === true;
}

async function setFallback(enabled) {
  const url = `/api/auth/fallback/${enabled ? 'enable' : 'disable'}`;
  const res = await fetch(url, { method: 'POST', credentials: 'include' });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || 'Failed to update fallback');
  }
  const body = await res.json();
  return body.enabled;
}

// Export functions
window.AdminAuth = {
  getAuthHeaders,
  checkAdminStatus,
  getFallbackStatus,
  setFallback
};