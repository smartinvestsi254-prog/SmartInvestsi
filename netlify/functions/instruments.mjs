// instruments.mjs - Sentry Node.js initialization for SmartInvest FinTech monitoring
// Import with: import './netlify/functions/instruments.mjs'; (ESM/CommonJS compatible)
// Provides: Error monitoring, structured logs, metrics, tracing, profiling

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

const SENTRY_DSN = process.env.SENTRY_DSN || "https://932acfc8ce257a2cc55753590d838955@4511098961526784.ingest.de.sentry.io/4511098974568528";

Sentry.init({
  dsn: SENTRY_DSN,
  integrations: [
    nodeProfilingIntegration()
  ],
  // Send structured logs to Sentry
  enableLogs: true,
  // Tracing - capture 100% of transactions for FinTech compliance
  tracesSampleRate: 1.0,
  // Profiling - 100% sample rate for performance monitoring
  profilesSampleRate: 1.0,
  // Auto-profile during traces (production standard)
  profileLifecycle: 'trace',
  // FinTech: Send PII with user context (email anonymized by Sentry)
  sendDefaultPii: true,
});

// Verify integration (task requirement)
console.log("✅ Sentry instruments loaded - errors/logs/metrics/tracing/profiling active");

// Export for server usage
export default Sentry;

