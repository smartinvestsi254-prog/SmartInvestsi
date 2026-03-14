// Shared authentication helpers for frontend (fetch-based)

export async function getCurrentUser() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    const body = await res.json();
    return body.user || null;
  } catch {
    return null;
  }
}

export async function requireAuth(redirect = '/login.html') {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = redirect;
    return null;
  }
  return user;
}

export async function login({ email, password }) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Login failed');
  return body;
}

export async function signup({ email, password, acceptTerms, extra = {} }) {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, acceptTerms, ...extra }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Signup failed');
  return body;
}

export async function logout() {
  document.cookie = 'si_token=;max-age=0;path=/';
  window.location.href = '/login.html';
}
