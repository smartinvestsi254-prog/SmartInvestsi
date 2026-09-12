/**
 * Netlify Function: Keyless CoinGecko Cache & Proxy
 * Endpoint: /.netlify/functions/market-data
 */

const BASE_URL = 'https://api.coingecko.com/api/v3';
const CACHE_TTL_SECONDS = 60; // Cache data for 60 seconds to satisfy the 30 req/min limit

// In-Memory Fallback Cache (for warm lambda instances)
let localCache = {
  data: null,
  timestamp: 0
};

exports.handler = async function (event, context) {
  const now = Date.now();

  // 1. Check local instance memory cache first
  if (localCache.data && (now - localCache.timestamp < CACHE_TTL_SECONDS * 1000)) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30, s-maxage=60',
        'X-Cache-Status': 'HIT_LOCAL'
      },
      body: JSON.stringify(localCache.data)
    };
  }

  try {
    // 2. Fetch directly from CoinGecko Keyless API
    const response = await fetch(
      `${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=15&page=1&sparkline=false`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SmartInvestsi-Platform/1.0'
        }
      }
    );

    // 3. Handle Rate Limit Status Code (429)
    if (response.status === 429) {
      console.warn('CoinGecko Keyless Rate Limit Exceeded (429)');
      
      // Serve stale cache if available
      if (localCache.data) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'X-Cache-Status': 'STALE_FALLBACK' },
          body: JSON.stringify(localCache.data)
        };
      }

      return {
        statusCode: 429,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Rate limit hit on Keyless Public API. Please retry shortly.' })
      };
    }

    if (!response.ok) {
      throw new Error(`CoinGecko HTTP Error: ${response.status}`);
    }

    const rawData = await response.json();

    // 4. Map & Normalize standard response format
    const formattedPrices = {};
    rawData.forEach(coin => {
      formattedPrices[coin.symbol.toUpperCase()] = {
        price: coin.current_price,
        change: coin.price_change_percentage_24h || 0,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        image: coin.image,
        market_cap: coin.market_cap,
        volume: coin.total_volume
      };
    });

    // Update in-memory cache
    localCache = {
      data: formattedPrices,
      timestamp: now
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30, s-maxage=60',
        'X-Cache-Status': 'MISS_FETCHED'
      },
      body: JSON.stringify(formattedPrices)
    };

  } catch (error) {
    console.error('Error fetching CoinGecko Keyless API:', error.message);

    // Serve stale cache on server failure
    if (localCache.data) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache-Status': 'STALE_FALLBACK' },
        body: JSON.stringify(localCache.data)
      };
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to retrieve cryptocurrency prices.' })
    };
  }
};
