// SmartInvestsi Public Configuration
// These values are safe to expose publicly.
//
// Configuration is resolved in the following priority order:
//   1. Runtime-injected environment variables exposed via window.__NETLIFY_ENV__
//      (populated by the Netlify build step from SUPABASE_URL, SUPABASE_ANON_KEY,
//       HCAPTCHA_SITE_KEY, etc.)
//   2. Fallback defaults below (corrected project ref: mylsjheuejnuwahzzjhz)

(function () {
  var injected = (typeof window !== "undefined" && window.__NETLIFY_ENV__) || {};

  var defaults = {
    supabaseUrl: 'https://mylsjheuejnuwahzzjhz.supabase.co',
supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bHNqaHVldWpudXdhaHp6amh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MDM4NjQsImV4cCI6MjA4NDk3OTg2NH0.KBj5zyxubnWhN-psV0Eb87-lFEXUSeq5vF1gTKoCBWk',
    supportEmail: 'support@smartinvestsi.netlify.app',
    supportPhone: '+27 11 123 4567',
    companyName: 'SmartInvestsi',
    companyDomain: 'https://smartinvestsi.netlify.app'
  };

  window.PUBLIC_CONFIG = {
    supabaseUrl: injected.SUPABASE_URL || defaults.supabaseUrl,
    supabaseAnonKey: injected.SUPABASE_ANON_KEY || defaults.supabaseAnonKey,
    hcaptchaSitekey: injected.HCAPTCHA_SITE_KEY || defaults.hcaptchaSitekey || '',
    supportEmail: injected.PUBLIC_SUPPORT_EMAIL || defaults.supportEmail,
    supportPhone: injected.PUBLIC_SUPPORT_PHONE || defaults.supportPhone,
    companyName: injected.PUBLIC_COMPANY_NAME || defaults.companyName,
    companyDomain: injected.PUBLIC_COMPANY_DOMAIN || defaults.companyDomain
  };
})();
