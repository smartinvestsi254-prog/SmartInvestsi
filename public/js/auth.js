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

export async function signup({ email, password, acceptTerms, captchaToken, extra = {} }) {
  const payload = { email, password, acceptTerms, captchaToken, ...extra };
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Signup failed');
  return body;
}

export async function login({ identifier, password, captchaToken }) {
  const payload = { password, captchaToken };
  if (identifier.includes('@')) payload.email = identifier;
  else if (identifier.startsWith('+')) payload.phone = identifier;
  else payload.idNumber = identifier;
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Login failed');
  return body;
}

// Terms modal logic
export function showTermsModal(callback) {
  // Implement modal to force terms read
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div class="modal fade" id="termsModal">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5>Terms of Service</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
            <iframe src="/terms.html" style="width:100%; height:400px; border:none;"></iframe>
          </div>
          <div class="modal-footer">
            <label class="form-check-label me-3">
              <input type="checkbox" class="form-check-input" id="modalTerms"> I accept
            </label>
            <button type="button" class="btn btn-primary" id="acceptTermsBtn" disabled>Accept</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal.firstElementChild);
  const bsModal = new bootstrap.Modal(modal.firstElementChild);
  bsModal.show();
  document.getElementById('modalTerms').addEventListener('change', (e) => {
    document.getElementById('acceptTermsBtn').disabled = !e.target.checked;
  });
  document.getElementById('acceptTermsBtn').addEventListener('click', () => {
    bsModal.hide();
    callback(true);
  });
}

export async function logout() {
  document.cookie = 'si_token=;max-age=0;path=/';
  window.location.href = '/login.html';
}
