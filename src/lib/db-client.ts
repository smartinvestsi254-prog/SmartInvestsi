/**
 * Resilient DB Client with Supabase -> Netlify Postgres failover
 * Auto-detects primary fail, switches to fallback, notifies admin
 * Admin can toggle/revoke via API
 */

import { PrismaClient } from '@prisma/client'
import CONFIG from '../config'
import { connectToDatabase } from './mongodb'
import { sendEmail } from '../../utils/mailer'
// import { createNotification } from '../../../netlify/functions/notifications' // mock, skip for now

type DbMode = 'primary' | 'fallback'

interface DbStatus {
  mode: DbMode
  lastSwitch: Date | null
  switchReason: string | null
  switchCount: number
  lastHealthCheck: Date
}

const ADMIN_EMAIL = CONFIG.DATABASE.ADMIN_EMAIL

let currentMode: DbMode = 'primary'
let primaryClient: PrismaClient | null = null
let fallbackClient: PrismaClient | null = null
let status: DbStatus = {
  mode: 'primary',
  lastSwitch: null,
  switchReason: null,
  switchCount: 0,
  lastHealthCheck: new Date()
}

async function getMongoDb() {
  return (await connectToDatabase()).db.collection('dbStatus')
}

async function loadState() {
  try {
    const db = await getMongoDb()
    const doc = await db.findOne({ _id: 'failover' }) as DbStatus | null
    if (doc) {
      currentMode = doc.mode
      status = doc
      if (currentMode === 'fallback') {
        primaryClient = null // force recreate if switch back later
      }
      console.log(`DB state loaded: ${currentMode}`)
    }
  } catch (err) {
    console.warn('Failed to load DB state, using memory:', err)
  }
}

async function saveState() {
  try {
    const db = await getMongoDb()
    await db.replaceOne(
      { _id: 'failover' },
      { _id: 'failover', ...status },
      { upsert: true }
    )
  } catch (err) {
    console.error('Failed to save DB state:', err)
  }
}

async function createClient(url: string): Promise<PrismaClient> {
  return new PrismaClient({
    datasources: { db: { url } },
    log: ['warn', 'error'],
  })
}

async function healthCheck(client: PrismaClient): Promise<boolean> {
  try {
    await client.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

async function switchToFallback(reason: string) {
  if (currentMode === 'fallback') return

  console.log(`Switching to fallback: ${reason}`)
  status.mode = 'fallback'
  status.lastSwitch = new Date()
  status.switchReason = reason
  status.switchCount += 1
  await saveState()

  // Notify admin
  await sendEmail(
    ADMIN_EMAIL,
    '🚨 SmartInvest DB FAILOVER ACTIVE',
    `Primary Supabase failed (${reason}). 
Switched to Netlify Postgres fallback.
Revoke via Admin > System Controls.
Health restored? Manual switch back.`
  ).catch(console.error)

  // In-app notif (if imported)
  // createNotification('admin', 'DB Failover', `Auto-switched to fallback: ${reason}`)

  // Recreate fallback client
  fallbackClient = await createClient(CONFIG.DATABASE.FALLBACK_URL)
}

async function switchToPrimary() {
  if (currentMode === 'primary') return

  console.log('Manual switch back to primary')
  status.mode = 'primary'
  status.lastSwitch = new Date()
  status.switchReason = 'manual_revoke'
  await saveState()

  primaryClient = null // force recreate
}

const withRetry = async <T>(fn: () => Promise<T>, retries = CONFIG.DATABASE.MAX_RETRIES): Promise<T> => {
  for (let i = 0; i <= retries; i++) {
    try {
      const client = currentMode === 'primary' ? primaryClient : fallbackClient
      if (!client) throw new Error('No client')
      return await fn()
    } catch (err) {
      console.warn(`DB query fail (${i+1}/${retries}):`, err)
      if (currentMode === 'primary' && i === 0) {
        const ok = await healthCheck(await createClient(CONFIG.DATABASE.PRIMARY_URL))
        if (!ok) {
          await switchToFallback('health_check_failed')
        }
      }
      if (i === retries) throw err
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i))) // backoff
    }
  }
  throw new Error('Max retries exceeded')
}

async function ensureClients() {
  if (!primaryClient) {
    primaryClient = await createClient(CONFIG.DATABASE.PRIMARY_URL)
  }
  if (!fallbackClient && currentMode === 'fallback') {
    fallbackClient = await createClient(CONFIG.DATABASE.FALLBACK_URL)
  }
}

function getCurrentClient(): PrismaClient {
  if (currentMode === 'primary') {
    if (!primaryClient) throw new Error('Primary client not ready')
    return primaryClient
  } else {
    if (!fallbackClient) throw new Error('Fallback client not ready')
    return fallbackClient
  }
}

async function getStatus(): Promise<DbStatus> {
  await ensureClients()
  status.lastHealthCheck = new Date()
  await saveState()
  return status
}

async function setMode(mode: DbMode): Promise<void> {
  if (mode === 'fallback') {
    await switchToFallback('manual')
  } else {
    await switchToPrimary()
  }
}

// Background health monitor (call from cron/API)
async function healthMonitor() {
  if (currentMode === 'fallback') return // don't ping primary on fallback
  await loadState()
  await ensureClients()
  const healthy = await healthCheck(primaryClient!)
  if (!healthy) {
    await switchToFallback('monitor_check_failed')
  }
}

const dbClient = {
  queryRaw: (query: TemplateStringsArray, ...args: any[]) => withRetry(() => getCurrentClient().$queryRaw(query, ...args)),
  // Proxy all Prisma methods with retry
  // For simplicity, wrap common: $queryRaw, findMany etc.
  $queryRawUnsafe: (query: string) => withRetry(() => getCurrentClient().$queryRawUnsafe(query)),
  // Add more as needed or Object.assign proxy
  healthCheck,
  getStatus,
  setMode,
  healthMonitor,
  getCurrentClient, // for direct if needed
}

export default dbClient

// Init on import
loadState().then(ensureClients)
setInterval(healthMonitor, CONFIG.DATABASE.HEALTH_CHECK_INTERVAL)
