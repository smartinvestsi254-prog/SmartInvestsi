// Simple CommonJS logger wrapper to be used by JS files
const DEBUG = process.env.DEBUG === 'true';

function info(...args) {
  console.log('[INFO]', ...args);
}

function warn(...args) {
  console.warn('[WARN]', ...args);
}

function error(...args) {
  console.error('[ERROR]', ...args);
}

function debug(...args) {
  if (DEBUG) console.debug('[DEBUG]', ...args);
}

module.exports = { info, warn, error, debug };
