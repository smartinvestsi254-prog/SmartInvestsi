// fixer.js
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

/**
 * Try simple automated remediation steps based on anomaly types.
 * Defaults are mostly linux-specific; on other platforms the step is skipped
 * but the anomaly is still logged.
 */
async function autoFix(anomalies) {
  for (let anomaly of anomalies) {
    switch (anomaly.type) {
      case "SERVER_ERROR":
        console.log("🔧 Restarting server...");
        try {
          await execAsync("pm2 restart all");
        } catch (err) {
          console.warn("Failed to restart server:", err.message);
        }
        break;

      case "HIGH_CPU":
        console.log("🔧 Clearing memory cache...");
        if (process.platform === "linux") {
          try {
            await execAsync("sync; echo 3 > /proc/sys/vm/drop_caches");
          } catch (err) {
            console.warn("Cache clear failed:", err.message);
          }
        } else {
          console.log("(skip - unsupported platform)");
        }
        break;

      case "SLOW_RESPONSE":
        console.log("🔧 Scaling or clearing cache...");
        // user can extend this block with cloud provider CLI
        break;

      default:
        console.log("⚠️ No fix available for type", anomaly.type);
    }
  }
}

module.exports = { autoFix };