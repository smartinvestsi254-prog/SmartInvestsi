import { Handler } from '@netlify/functions';
import { PersonalizationService, personalizationService } from '../../../src/services/PersonalizationService';
import dbClient from '../../../src/lib/db-client';
import logger from './logger'; // Assume exists from other functions

const prisma = dbClient.getClient();

interface ProfileData {
  riskTolerance: string;
  investmentGoals: string[];
  preferences: Record<string, any>;
  subscriptionTier: string;
}

export const handler: Handler = async (event) => {
  const { httpMethod, path, body, headers } = event;
  const userId = headers['x-user-id'] || headers['x-email'];

  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, error: 'User ID required (x-user-id header)' })
    };
  }

  try {
    let result;

    switch (httpMethod) {
      case 'GET':
        if (path.includes('/profile')) {
          result = await personalizationService.getProfile(userId);
        } else if (path.includes('/recommendations')) {
          const profile = await personalizationService.getProfile(userId);
          result = await personalizationService.getRecommendations(userId, profile);
        } else {
          return { statusCode: 404, body: JSON.stringify({ error: 'Endpoint not found' }) };
        }
        break;

      case 'POST':
        const data = JSON.parse(body || '{}');

        if (path.includes('/profile')) {
          result = await personalizationService.updateProfile(userId, data);
        } else if (path.includes('/referral')) {
          result = await personalizationService.createReferral(userId, data.refereeEmail);
        } else {
          return { statusCode: 404, body: JSON.stringify({ error: 'Endpoint not found' }) };
        }
        break;

      case 'PUT':
        if (path.includes('/referral/complete')) {
          const { refereeId } = JSON.parse(body || '{}');
          result = await personalizationService.completeReferral(userId, refereeId);
        }
        break;

      default:
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-user-id, x-role',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
      },
      body: JSON.stringify({ success: true, data: result })
    };
  } catch (error: any) {
    logger.error('Personalization API error', { userId, error: error.message });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};

