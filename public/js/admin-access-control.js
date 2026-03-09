/**
 * Admin Portal Access Control
 * Protects admin.html and dashboard.html from unauthorized access
 * Ensures only authenticated admin users can access admin features
 */

document.addEventListener('DOMContentLoaded', function() {
  verifyAdminAccess();
});

async function verifyAdminAccess() {
  try {
    const response = await fetch('/api/admin/verify-access', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      redirectToLogin();
      return;
    }

    const data = await response.json();
    if (!data.isAdmin) {
      redirectToUnauthorized();
      return;
    }

    // Admin access verified
    updateAdminIndicators();
  } catch (error) {
    console.error('Admin access verification failed:', error);
    redirectToLogin();
  }
}

function redirectToLogin() {
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
  }
}

function redirectToUnauthorized() {
  window.location.href = '/403.html';
}

function updateAdminIndicators() {
  // Add admin badge to the header
  const header = document.querySelector('header');
  if (header) {
    const badge = document.createElement('div');
    badge.style.cssText = `
      display: inline-block;
      background: linear-gradient(135deg, #D4AF37, #f4d03f);
      color: #0B1F33;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      margin-inline-start: 12px;
    `;
    badge.textContent = '🔐 ADMIN MODE';
    header.appendChild(badge);
  }
}

async function logAdminAction(action, details = {}) {
  try {
    await fetch('/api/admin/log-action', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action,
        details,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

// Prevent admin page caching
if (window.history.replaceState) {
  window.history.replaceState(null, null, window.location.href);
}

// Disable right-click context menu on admin pages (optional security measure)
// Uncomment to enable
/*
document.addEventListener('contextmenu', function(e) {
  if (window.location.pathname.includes('/admin')) {
    e.preventDefault();
    return false;
  }
});
*/
