// SmartInvestsi Public Configuration
// Runtime-safe placeholders. Populate these values via meta tags in your HTML (see README/DEPLOYMENT_GUIDE)

(function () {
  function getMeta(name) {
    const m = document.querySelector(`meta[name="${name}"]`);
    return m ? m.content : '';
  }

  window.PUBLIC_CONFIG = {
    supabaseUrl: getMeta('NEXT_PUBLIC_SUPABASE_URL') || '',
    supabaseAnonKey: getMeta('NEXT_PUBLIC_SUPABASE_ANON_KEY') || '',
    hcaptchaSitekey: getMeta('NEXT_PUBLIC_HCAPTCHA_SITEKEY') || '',
    supportEmail: getMeta('NEXT_PUBLIC_SUPPORT_EMAIL') || '',
    supportPhone: getMeta('NEXT_PUBLIC_SUPPORT_PHONE') || '',
    appUrl: getMeta('NEXT_PUBLIC_APP_URL') || window.location.origin
  };

  // Quick sanity check in dev
  if (window.location.hostname === 'localhost' && !window.PUBLIC_CONFIG.supabaseUrl) {
    // eslint-disable-next-line no-console
    console.warn('PUBLIC_CONFIG not fully populated. Add meta tags for NEXT_PUBLIC_* values or configure at build time.');
  }
})();
