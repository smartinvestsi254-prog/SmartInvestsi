import type { HandlerEvent, HandlerResponse } from '@netlify/functions'
import adminService from '../../src/lib/admin-service'
import dbClient from '../../src/lib/db-client'
import { getCorsHeaders } from './lib/cors'
import { isAdminFromEvent } from './lib/auth-utils'

function response(statusCode: number, payload: unknown = {}, origin = ''): HandlerResponse {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) },
    body: JSON.stringify(payload),
  }
}

export default async (event: HandlerEvent): Promise<HandlerResponse> => {
  const origin = event.headers?.origin || event.headers?.Origin || ''
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' }, origin)
  }

  // Admin auth (JWT-based, fintech-grade)
  if (!await isAdminFromEvent(event)) {
    return response(401, { error: 'Unauthorized' }, origin)
  }

  try {
    if (event.httpMethod === 'GET') {
      const status = await dbClient.getStatus()
      await adminService.logAdminAction('admin', 'db_status_check', status)
      return response(200, status, origin)
    }

    if (event.httpMethod === 'POST') {
      const { mode } = JSON.parse(event.body || '{}')
      if (!['primary', 'fallback'].includes(mode)) {
        return response(400, { error: 'Invalid mode' }, origin)
      }
      await dbClient.setMode(mode)
      const status = await dbClient.getStatus()
      await adminService.logAdminAction('admin', 'db_mode_switch', { mode, status })
      return response(200, { success: true, status }, origin)
    }
  } catch (err) {
    console.error('DB failover API error:', err)
    return response(500, { error: 'Internal error' }, origin)
  }

  return response(400, { error: 'Bad request' }, origin)
}
