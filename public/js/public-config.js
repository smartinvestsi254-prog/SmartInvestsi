// SmartInvestsi Public Configuration - runtime-safe placeholders
// This file intentionally avoids embedding any secret or service-role keys.
window.PUBLIC_CONFIG = {
  supabaseUrl: (window.__PUBLIC_SUPABASE_URL__ || 'https://<your-project>.supabase.co'),
  supabaseAnonKey: (window.__PUBLIC_SUPABASE_ANON_KEY__ || 'REPLACE_WITH_NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supportEmail: 'support@smartinvestsi.netlify.app',
  supportPhone: '+254 114383762',
  companyName: 'SmartInvestsi',
  companyDomain: window.location.origin
};
