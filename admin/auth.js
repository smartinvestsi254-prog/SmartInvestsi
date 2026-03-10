// Admin Authentication Module

// Supabase client (assuming it's loaded globally or imported)
const { createClient } = supabase;
const supabaseUrl = 'https://your-supabase-url.supabase.co'; // Replace with actual URL
const supabaseKey = 'your-anon-key'; // Replace with actual key
const supabase = createClient(supabaseUrl, supabaseKey);

// Admin email list
const ADMIN_EMAILS = ['admin@smartinvestsi.com', 'support@smartinvestsi.com']; // Add actual admin emails

/**
 * Get authentication headers for API calls
 */
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No active session');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Check if current user is admin
 */
async function checkAdminStatus() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return false;
    }
    return ADMIN_EMAILS.includes(user.email);
  } catch (e) {
    console.error('Admin check failed:', e);
    return false;
  }
}

// Export functions
window.AdminAuth = {
  getAuthHeaders,
  checkAdminStatus
};