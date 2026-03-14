/**
 * Portfolio Management Handler for SmartInvestsi - TypeScript Refactored (Fixed)
 * Compatible with portfolio.ts interfaces, no local type conflicts
 */

import logger from './logger';
import {
  getUserPortfolios,
  getPortfolio,
  createPortfolio,
  updatePortfolioHoldings,
  calculatePortfolioAnalytics
} from './portfolio';
import type {
  NetlifyEvent,
  NetlifyContext,
  APIResponse,
  PortfolioBody,
  HTTPStatus
} from './types';
import type { Portfolio, Holding } from './portfolio';

export const handler = async function(event: NetlifyEvent, context: NetlifyContext): Promise<APIResponse> {
  const userId = event.headers['x-user-id'] || 'demo-user'; // In production, get from JWT

  try {
    if (event.httpMethod === 'GET') {
      if (event.path.includes('/analytics/')) {
        const portfolioId = event.path.split('/analytics/')[1];
        const portfolio = getPortfolio(portfolioId, userId);

        if (!portfolio) {
          return {
            statusCode: 404 as HTTPStatus,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ success: false, error: 'Portfolio not found' })
          };
        }

        const analytics = calculatePortfolioAnalytics(portfolio);

        return {
          statusCode: 200 as HTTPStatus,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ success: true, data: analytics })
        };
      } else {
        const portfolios = getUserPortfolios(userId);
        return {
          statusCode: 200 as HTTPStatus,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ success: true, data: portfolios })
        };
      }
    }

    if (event.httpMethod === 'POST') {
      let body: PortfolioBody;
      try {
        body = JSON.parse(event.body || '{}') as PortfolioBody;
      } catch {
        return {
          statusCode: 400 as HTTPStatus,
          body: JSON.stringify({ success: false, error: 'Invalid JSON body' })
        };
      }

      const { action, name, holdings } = body;

      if (action === 'create') {
        if (!name) {
          return {
            statusCode: 400 as HTTPStatus,
            body: JSON.stringify({ success: false, error: 'Portfolio name is required' })
          };
        }

        const portfolio = createPortfolio(userId, name);

        return {
          statusCode: 201 as HTTPStatus,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ success: true, data: portfolio })
        };
      }

      if (action === 'update-holdings') {
        const portfolioId = event.path.split('/').pop() || '';
        if (!portfolioId || !holdings) {
          return {
            statusCode: 400 as HTTPStatus,
            body: JSON.stringify({ success: false, error: 'Portfolio ID and holdings are required' })
          };
        }

        // Cast holdings to match Holding[] expected by updatePortfolioHoldings
        const portfolio = updatePortfolioHoldings(portfolioId, userId, holdings as unknown as Holding[]);

        if (!portfolio) {
          return {
            statusCode: 404 as HTTPStatus,
            body: JSON.stringify({ success: false, error: 'Portfolio not found' })
          };
        }

        return {
          statusCode: 200 as HTTPStatus,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ success: true, data: portfolio })
        };
      }
    }

    return {
      statusCode: 405 as HTTPStatus,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };

  } catch (error: unknown) {
    logger.error('Portfolio API error', { 
      error: (error as Error).message, 
      stack: (error as Error).stack, 
      userId 
    });
    return {
      statusCode: 500 as HTTPStatus,
      body: JSON.stringify({ success: false, error: 'Portfolio operation failed' })
    };
  }
};
