// rate-limiting.js
// Simple per-IP sliding window implementation with configurable limits.

const rateMap = new Map();

/**
 * rateLimit(ip, options) -> boolean
 * options: { windowMs, max }
 * Returns true if the request is allowed, false if rate limited.
 */
function rateLimit(ip, options = {}) {
  const windowMs = Number(options.windowMs) || Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000;
  const max = Number(options.max) || Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

  const now = Date.now();
  const timestamps = rateMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    // Already exceeded
    rateMap.set(ip, recent);
    return false;
  }

  recent.push(now);
  rateMap.set(ip, recent);
  return true;
}

module.exports = { rateLimit, _rateMap: rateMap };