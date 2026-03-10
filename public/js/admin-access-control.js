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
    // Import Supabase client
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const supabase = createClient(
      'https://mylsjhueujnuwahzzjhz.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bHNqaHVldWpudXdhaHp6amh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MDM4NjQsImV4cCI6MjA4NDk3OTg2NH0.KBj5zyxubnWhN-psV0Eb87-lFEXUSeq5vF1gTKoCBWk'
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      redirectToLogin();
      return;
    }

    // Check if user has admin role
    // For now, check if email is in admin list or has admin metadata
    const adminEmails = ['admin@example.com', 'admin@smartinvestsi.com']; // Add admin emails here
    const isAdmin = adminEmails.includes(user.email) || user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin';

    if (!isAdmin) {
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
