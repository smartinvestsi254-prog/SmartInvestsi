// config.js
// Configuration with environment overrides, falling back to sensible defaults
const env = process.env;

function parseList(envVar, fallback) {
  if (!envVar) return fallback;
  return envVar.split(/[,;\s]+/).filter(Boolean);
}

module.exports = {
  URLS: parseList(env.URLS, [
    "https://smartinvestsi.com",
    "https://smartinvestsi.com/api"
  ]),
  RESPONSE_TIME_THRESHOLD: Number(env.RESPONSE_TIME_THRESHOLD) || 2000, // ms
  ERROR_RATE_THRESHOLD: Number(env.ERROR_RATE_THRESHOLD) || 0.2, // fraction
  HISTORY_LIMIT: Number(env.HISTORY_LIMIT) || 100,
  CHECK_INTERVAL: env.CHECK_INTERVAL || "*/1 * * * *", // every minute
  EMAIL: {
    service: env.EMAIL_SERVICE || env.SMTP_SERVICE || "gmail",
    user: env.EMAIL_USER || env.SMTP_USER || "",
    pass: env.EMAIL_PASS || env.SMTP_PASS || "",
    to: parseList(env.EMAIL_TO || env.SMTP_TO, [env.EMAIL_USER || env.SMTP_USER]).join(",")
  }
};
