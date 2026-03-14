// monitor.js
const axios = require("axios");
const os = require("os");
const config = require("./config");
const { sendAlert } = require("./reporter");
const { autoFix } = require("./fixer");
const { info, warn, error } = require("../../src/utils/logger");

let history = [];
let running = false;

const client = axios.create({ timeout: 5000 });

async function checkEndpoint(url) {
  const start = Date.now();
  try {
    const res = await client.get(url);
    const time = Date.now() - start;

    return {
      url,
      status: res.status,
      responseTime: time,
      success: true
    };
  } catch (err) {
    return {
      url,
      status: err.response?.status || 500,
      responseTime: Date.now() - start,
      success: false
    };
  }
}

function detectAnomaly(results) {
  let anomalies = [];

  let failures = 0;
  results.forEach(r => {
    if (r.responseTime > config.RESPONSE_TIME_THRESHOLD) {
      anomalies.push({ type: "SLOW_RESPONSE", data: r });
    }

    if (!r.success || r.status >= 500) {
      failures++;
      anomalies.push({ type: "SERVER_ERROR", data: r });
    }
  });

  // error rate check
  if (results.length > 0 && failures / results.length >= config.ERROR_RATE_THRESHOLD) {
    anomalies.push({ type: "HIGH_ERROR_RATE", data: { rate: failures / results.length } });
  }

  // System resource check
  const load = os.loadavg()[0];
  if (load > 2) {
    anomalies.push({ type: "HIGH_CPU", data: { load } });
  }

  return anomalies;
}

async function monitor() {
  if (running) {
    console.warn("Monitor already running, skipping overlapping invocation");
    return;
  }
  running = true;
  try {
    const results = await Promise.all(
      config.URLS.map(checkEndpoint)
    );

    history.push(results);
    if (history.length > config.HISTORY_LIMIT) {
      history.shift(); // discard oldest
    }

    const anomalies = detectAnomaly(results);

    if (anomalies.length > 0) {
      warn("⚠️ Anomalies detected:", anomalies);

      await sendAlert(anomalies);
      await autoFix(anomalies);
    } else {
      info("✅ System healthy");
    }
  } catch (err) {
    error("Unexpected error during monitoring:", err);
  } finally {
    running = false;
  }
}

module.exports = { monitor };
