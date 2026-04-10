// sentrydsn.js - safe Sentry initialization (do not hardcode DSNs)
// Uses SENTRY_DSN from environment. Avoid sending PII by default.

const Sentry = require('@sentry/node');

function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    // No DSN configured — do not initialize Sentry in local/dev by default.
    // This avoids leaking keys and accidental telemetry in CI/dev.
    // Calling code can still require the file and check Sentry if needed.
    if (process.env.NODE_ENV === 'production') {
      console.warn('SENTRY_DSN not set in production — consider configuring a DSN to capture errors.');
    }
    return null;
  }

  // Initialize Sentry with conservative defaults for a fintech product.
  Sentry.init({
    dsn,
    // Keep sample rates conservative in production; default to 10% traces.
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    // Do not send default PII in a fintech environment unless explicitly required.
    sendDefaultPii: process.env.SENTRY_SEND_DEFAULT_PII === 'true' || false,
    // Optionally enable profiling if explicitly configured (disabled by default).
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.0'),
  });

  return Sentry;
}

// Initialize on require so server code gets Sentry initialized early when configured.
const sentry = initSentry();

module.exports = { initSentry, sentry };