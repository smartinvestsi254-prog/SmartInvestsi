/**
 * Portfolio Management Handler for SmartInvestsi
 */

import logger from './logger';
import {
  getUserPortfolios,
  getPortfolio,
  createPortfolio,
  updatePortfolioHoldings,
  calculatePortfolioAnalytics
} from './portfolio';

export const handler = async function(event: any, context: any): Promise<any> {
  const userId = event.headers['x-user-id'] || 'demo-user'; // In production, get from JWT

  try {
    if (event.httpMethod === 'GET') {
      // Get user's portfolios
      if (event.path.includes('/analytics/')) {
        const portfolioId = event.path.split('/analytics/')[1];
        const portfolio = getPortfolio(portfolioId, userId);

        if (!portfolio) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Portfolio not found' })
          };
        }

        const analytics = calculatePortfolioAnalytics(portfolio);

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ success: true, analytics })
        };
      } else {
        const portfolios = getUserPortfolios(userId);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ success: true, portfolios })
        };
      }
    }

    if (event.httpMethod === 'POST') {
      const { action, name, holdings } = JSON.parse(event.body || '{}');

      if (action === 'create') {
        if (!name) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Portfolio name is required' })
          };
        }

        const portfolio = createPortfolio(userId, name);

        return {
          statusCode: 201,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ success: true, portfolio })
        };
      }

      if (action === 'update-holdings') {
        const portfolioId = event.path.split('/').pop();
        if (!portfolioId || !holdings) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Portfolio ID and holdings are required' })
          };
        }

        const portfolio = updatePortfolioHoldings(portfolioId, userId, holdings);

        if (!portfolio) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Portfolio not found' })
          };
        }

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ success: true, portfolio })
        };
      }
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error: any) {
    logger.error('Portfolio API error', { error: error.message, stack: error.stack, userId });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Portfolio operation failed' })
    };
  }
};