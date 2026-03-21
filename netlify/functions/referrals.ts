import { Handler } from '@netlify/functions';
import { ReferralService, referralService } from '../../../src/services/ReferralService';
import { personalizationService } from '../../../src/services/PersonalizationService';
import dbClient from '../../../src/lib/db-client';
import logger from './logger'; // Reuse from other functions

export const handler: Handler = async (event) => {
  const { httpMethod, body, headers } = event;
  const userId = headers['x-user-id'];

  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ success: false, error: 'x-user-id header required' }) };
  }

  try {
    let result;

    if (httpMethod === 'POST') {
      const data = JSON.parse(body || '{}');
      if (event.path.includes('/create')) {
        result = await referralService.createReferral(userId, data.refereeEmail);
      } else {
        return { statusCode: 404, body: JSON.stringify({ error: 'Endpoint not found' }) };
      }
    } else if (httpMethod === 'GET') {
      if (event.path.includes('/stats')) {
        result = await referralService.getReferralStats(userId);
      } else if (event.path.includes('/list')) {
        result = await referralService.getUserReferrals(userId);
      } else {
        return { statusCode: 404, body: JSON.stringify({ error: 'Endpoint not found' }) };
      }
    } else if (httpMethod === 'PUT' && event.path.includes('/complete')) {
      const { referralId, refereeId } = JSON.parse(body || '{}');
      result = await referralService.completeReferral(referralId, refereeId);
    } else {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-user-id',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
      },
      body: JSON.stringify({ success: true, data: result })
    };
  } catch (error: any) {
    logger.error('Referral API error', { userId, error: error.message });
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};

