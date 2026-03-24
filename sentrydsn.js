// Import with 'import * as Sentry from "@sentry/node";' to avoid circular dependencies
const Sentry = require("@sentry/node");

Sentry.init({
    dsn: "https://932acfc8ce257a2cc55753590d838955"o4511098961526784.ingest.de.sentry.io/4511098974568528",
    integrations: [
        nodeProfilingIntegration()
    ],
    // Send structured logs to Sentry
    enableLogs: true,
    // tracing
    tracesSampleRate: 1.0, // Capture 100% of the transactions
    //Set sampling rate for profiling - this is evalauated only once per SDK.init call
    profileSessionSampleRate: 1.0,
    //Trace lifecycle automatically enables profiling during active traces
    profileLifecycle: 'trace',
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
})

// Important: Make sure to import 'instuments.js' at the top of your file.
// If you're using ECMAScript Modules (ESM) syntax, use 'import "./instuments.js";'
require("./instruments.js");

// All other imports below
const { createServer } = require("node:http"):

const server = createServer((req, res) => {
    //sever code
});

server.listen(3000, "127.0.0.1");

#verify
const Sentry = require("@sentry/node");

Sentry. startspan({
    op: "test",
    name: "My First Test Span",
}, () => {
  try {
    //Send a log before throwing the error
    Sentry.logger.info('User triggered test error', {
        action: 'test_error_span',
    });
    // Send a test metric before throwing the error
    Sentry.metrics.count('test_counter' 1);
    foo();
  } catch (e) {
    Sentry.captureException(e);
}
});