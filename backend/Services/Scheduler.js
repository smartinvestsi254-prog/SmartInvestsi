// index.js
// lightweight scheduler for health monitoring
const cron = require("node-cron");
const config = require("./config");

// attempt to resolve monitor from payment subfolder
let monitor;
try {
  monitor = require("./Payment/monitor").monitor;
} catch (err) {
  const { error } = require('../src/utils/logger');
  error("Failed to load monitor module:", err);
  // rethrow so that startup fails fast when scheduler is mis‑configured
  throw err;
}

let task;

function start() {
  if (task) {
    const { warn } = require('../src/utils/logger');
    warn("Scheduler already running");
    return;
  }
  task = cron.schedule(config.CHECK_INTERVAL, monitor);
  const { info } = require('../src/utils/logger');
  info("🚀 Monitoring scheduled at", config.CHECK_INTERVAL);
}

function stop() {
  if (task) {
    task.stop();
    task = null;
    const { info } = require('../src/utils/logger');
    info("🛑 Monitoring stopped");
  }
}

// automatically start when this module is required directly
if (require.main === module) {
  start();
}

module.exports = { start, stop };
