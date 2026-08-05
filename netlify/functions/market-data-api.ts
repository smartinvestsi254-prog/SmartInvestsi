/**
 * Market Data API Handler for SmartInvestsi
 */

import logger from './logger';
import {
  getMarketData,
  getMultipleMarketData,
  getMarketOverview,
  getHistoricalData,
  searchSymbols,
  getMarketIndices
} from './market-data';

export const handler = async function(event: any, context: any): Promise<any> {
  try {
    if (event.httpMethod === 'GET') {
      const path = event.path || '';
      const queryParams = event.queryStringParameters || {};

      // Get specific symbol data
      if (path.includes('/quote/')) {
        const symbol = path.split('/quote/')[1];
        if (!symbol) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Symbol is required' })
          };
        }

        const data = getMarketData(symbol);
        if (!data) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Symbol not found' })
          };
        }

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ success: true, data })
        };
      }

      // Get market overview
      if (path.includes('/overview')) {
        const overview = getMarketOverview();

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ success: true, data: overview })
        };
      }

      // Get market indices
      if (path.includes('/indices')) {
        const indices = getMarketIndices();

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ success: true, data: indices })
        };
      }

      // Get historical data
      if (path.includes('/history/')) {
        const parts = path.split('/history/')[1].split('/');
        const symbol = parts[0];
        const period = (parts[1] || '1M') as '1D' | '1W' | '1M' | '3M' | '1Y';

        if (!symbol) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Symbol is required' })
          };
        }

        const data = getHistoricalData(symbol, period);
        if (!data) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Symbol not found' })
          };
        }

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ success: true, data })
        };
      }

      // Search symbols
      if (path.includes('/search')) {
        const query = queryParams.q || '';
        if (!query) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Search query is required' })
          };
        }

        const results = searchSymbols(query);

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ success: true, data: results })
        };
      }

      // Get multiple symbols
      if (path.includes('/batch')) {
        const symbols = queryParams.symbols ? queryParams.symbols.split(',') : [];
        if (symbols.length === 0) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Symbols parameter is required' })
          };
        }

        const data = getMultipleMarketData(symbols);

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ success: true, data })
        };
      }
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error: any) {
    logger.error('Market data API error', { error: error.message, stack: error.stack });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Market data request failed' })
    };
  }
};