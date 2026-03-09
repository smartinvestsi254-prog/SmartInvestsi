/**
 * Storage Complex Module
 * Centralized storage for all data: cache, crashes, users, admin actions, and logs
 * All data is stored with timestamps for audit and tracking purposes
 * Access restricted to admin: see ADMIN_USER in env
 */

const fs = require('fs');
const path = require('path');

// Storage directory and file paths
const STORAGE_DIR = path.join(__dirname, 'data');
const STORAGE_FILE = path.join(STORAGE_DIR, 'storage-complex.json');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

/**
 * Storage Complex Structure:
 * {
 *   cache: [],
 *   crashes: [],
 *   users: [],
 *   admin: [],
 *   logs: []
 * }
 */

/**
 * Read the storage complex
 */
function readStorageComplex() {
  try {
    if (!fs.existsSync(STORAGE_FILE)) {
      return {
        cache: [],
        crashes: [],
        users: [],
        admin: [],
        logs: []
      };
    }
    const data = fs.readFileSync(STORAGE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading storage complex:', error.message);
    return {
      cache: [],
      crashes: [],
      users: [],
      admin: [],
      logs: []
    };
  }
}

/**
 * Write to the storage complex
 */
function writeStorageComplex(data) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing storage complex:', error.message);
    return false;
  }
}

/**
 * Add a cache entry
 */
function addCacheEntry(key, value, metadata = {}) {
  const storage = readStorageComplex();
  const entry = {
    id: generateId(),
    key,
    value,
    metadata,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString()
  };
  storage.cache.push(entry);
  writeStorageComplex(storage);
  return entry;
}

/**
 * Add a crash/error entry
 */
function addCrashEntry(error, context = {}) {
  const storage = readStorageComplex();
  const entry = {
    id: generateId(),
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error,
    context,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString()
  };
  storage.crashes.push(entry);
  writeStorageComplex(storage);
  return entry;
}

/**
 * Add a user activity entry
 */
function addUserEntry(userId, action, data = {}) {
  const storage = readStorageComplex();
  const entry = {
    id: generateId(),
    userId,
    action,
    data,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString()
  };
  storage.users.push(entry);
  writeStorageComplex(storage);
  return entry;
}

/**
 * Add an admin action entry
 */
function addAdminEntry(adminEmail, action, data = {}) {
  const storage = readStorageComplex();
  const entry = {
    id: generateId(),
    adminEmail,
    action,
    data,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString()
  };
  storage.admin.push(entry);
  writeStorageComplex(storage);
  return entry;
}

/**
 * Add a general log entry
 */
function addLogEntry(level, message, data = {}) {
  const storage = readStorageComplex();
  const entry = {
    id: generateId(),
    level,
    message,
    data,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString()
  };
  storage.logs.push(entry);
  writeStorageComplex(storage);
  return entry;
}

/**
 * Get all storage data (admin only)
 */
function getAllStorageData() {
  return readStorageComplex();
}

/**
 * Get storage data by type
 */
function getStorageByType(type) {
  const storage = readStorageComplex();
  return storage[type] || [];
}

/**
 * Get storage statistics
 */
function getStorageStats() {
  const storage = readStorageComplex();
  return {
    cache: storage.cache.length,
    crashes: storage.crashes.length,
    users: storage.users.length,
    admin: storage.admin.length,
    logs: storage.logs.length,
    total: storage.cache.length + storage.crashes.length + storage.users.length + storage.admin.length + storage.logs.length
  };
}

/**
 * Clear storage by type (admin only)
 */
function clearStorageByType(type) {
  const storage = readStorageComplex();
  if (storage[type]) {
    storage[type] = [];
    writeStorageComplex(storage);
    return true;
  }
  return false;
}

/**
 * Generate unique ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

module.exports = {
  addCacheEntry,
  addCrashEntry,
  addUserEntry,
  addAdminEntry,
  addLogEntry,
  getAllStorageData,
  getStorageByType,
  getStorageStats,
  clearStorageByType
};
