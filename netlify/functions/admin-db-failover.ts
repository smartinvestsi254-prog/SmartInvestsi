import type { HandlerEvent } from '@netlify/functions'
import { NetlifyResponse } from './NetlifyResponse' // adjust if type only
import adminService from '../../../../src/lib/admin-service'
import dbClient from '../../../../src/lib/db-client'

type HandlerContext = any // fallback

export default async (event: any, context: any): Promise<Response> => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return new NetlifyResponse(405, { error: 'Method not allowed' })
  }

  // Admin auth (use existing)
  const authHeader = event.headers.authorization
  if (!authHeader || !await adminService.verifyAdminCredentials(authHeader)) {
    return new NetlifyResponse(401, { error: 'Unauthorized' })
  }

  try {
    if (event.httpMethod === 'GET') {
      const status = await dbClient.getStatus()
      await adminService.logAdminAction('admin', 'db_status_check', status)
      return new NetlifyResponse(200, status)
    }

    if (event.httpMethod === 'POST') {
      const { mode } = JSON.parse(event.body)
      if (!['primary', 'fallback'].includes(mode)) {
        return new NetlifyResponse(400, { error: 'Invalid mode' })
      }
      await dbClient.setMode(mode as any)
      const status = await dbClient.getStatus()
      await adminService.logAdminAction('admin', 'db_mode_switch', { mode, status })
      return new NetlifyResponse(200, { success: true, status })
    }
  } catch (err) {
    console.error('DB failover API error:', err)
    return new NetlifyResponse(500, { error: 'Internal error' })
  }

  return new NetlifyResponse(400)
}
