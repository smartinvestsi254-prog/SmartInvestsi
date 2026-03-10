// Shared authentication helpers for frontend
// This module uses Supabase client via CDN and caches results

let adminCache = null;

export async function checkAdminStatus() {
  if (adminCache !== null) return adminCache;
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const supabase = createClient(
      'https://mylsjhueujnuwahzzjhz.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bHNqaHVldWpudXdhaHp6amh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MDM4NjQsImV4cCI6MjA4NDk3OTg2NH0.KBj5zyxubnWhN-psV0Eb87-lFEXUSeq5vF1gTKoCBWk'
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      adminCache = false;
      return adminCache;
    }
    const adminEmails = ['admin@example.com', 'admin@smartinvestsi.com'];
    adminCache = adminEmails.includes(user.email) || user.user_metadata?.role === 'admin';
    return adminCache;
  } catch (err) {
    console.error('Admin check failed:', err);
    adminCache = false;
    return adminCache;
  }
}

export async function getAuthHeaders() {
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const supabase = createClient(
      'https://mylsjhueujnuwahzzjhz.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bHNqaHVldWpudXdhaHp6amh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MDM4NjQsImV4cCI6MjA4NDk3OTg2NH0.KBj5zyxubnWhN-psV0Eb87-lFEXUSeq5vF1gTKoCBWk'
    );
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = 'Bearer ' + session.access_token;
    }
    return headers;
  } catch {
    return {};
  }
}
