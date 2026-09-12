/**
 * Netlify Function: Resilient Crypto Proxy with Automatic Binance Failover
 * Primary: CoinGecko Keyless API (30 req/min limit)
 * Secondary: Binance Public API (Zero API Key / High Limits)
 */

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const BINANCE_BASE = 'https://api.binance.com/api/v3';

// Symbol mapping between systems
const SYMBOL_MAP = {
  BTC: { binance: 'BTCUSDT', geckoId: 'bitcoin', name: 'Bitcoin', symbol: '₿' },
  ETH: { binance: 'ETHUSDT', geckoId: 'ethereum', name: 'Ethereum', symbol: 'Ξ' },
  SOL: { binance: 'SOLUSDT', geckoId: 'solana', name: 'Solana', symbol: 'SOL' },
  BNB: { binance: 'BNBUSDT', geckoId: 'binancecoin', name: 'BNB', symbol: 'BNB' },
  XRP: { binance: 'XRPUSDT', geckoId: 'ripple', name: 'XRP', symbol: 'XRP' }
};

// Global in-memory state across warm Lambda invocations
let state = {
  isCoinGeckoRateLimited: false,
  rateLimitResetTime: 0,
  cache: null,
  cacheTimestamp: 0
};

const COOLDOWN_MS = 2 * 60 * 1000; // 2-minute fallback to Binance when 429 occurs
const CACHE_TTL_MS = 30 * 1000;    // 30-second local cache

exports.handler = async function (event) {
  const now = Date.now();

  // 1. Serve cached data if valid
  if (state.cache && (now - state.cacheTimestamp < CACHE_TTL_MS)) {
    return createResponse(200, state.cache, 'HIT_CACHE');
  }

  // 2. Check Circuit Breaker Status
  if (state.isCoinGeckoRateLimited) {
    if (now < state.rateLimitResetTime) {
      console.warn('⚠️ Circuit Breaker Open: Redirecting request directly to Binance API');
      return await fetchFromBinance('CIRCUIT_OPEN_FAILOVER');
    } else {
      // Cooldown completed; close circuit and attempt CoinGecko again
      state.isCoinGeckoRateLimited = false;
    }
  }

  // 3. Primary Attempt: CoinGecko Keyless API
  try {
    const geckoRes = await fetch(
      `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=15&page=1&sparkline=false`,
      { headers: { 'Accept': 'application/json', 'User-Agent': 'SmartInvestsi-Platform/1.0' } }
    );

    // Track Rate Limits (429)
    if (geckoRes.status === 429) {
      triggerCircuitBreaker('CoinGecko 429 Rate Limit Exceeded');
      return await fetchFromBinance('FAILOVER_ON_429');
    }

    if (!geckoRes.ok) {
      throw new Error(`CoinGecko HTTP Error ${geckoRes.status}`);
    }

    const data = await geckoRes.json();
    const formatted = {};

    data.forEach(coin => {
      formatted[coin.symbol.toUpperCase()] = {
        price: coin.current_price,
        change: coin.price_change_percentage_24h || 0,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        image: coin.image,
        provider: 'CoinGecko'
      };
    });

    updateCache(formatted);
    return createResponse(200, formatted, 'FETCHED_COINGECKO');

  } catch (error) {
    console.error('CoinGecko Primary Failure:', error.message);
    return await fetchFromBinance('FAILOVER_ON_ERROR');
  }
};

/**
 * Secondary Endpoint: Fetch real-time market tickers from Binance Public API
 */
async function fetchFromBinance(reason) {
  try {
    const res = await fetch(`${BINANCE_BASE}/ticker/24hr`);
    if (!res.ok) throw new Error(`Binance HTTP Error ${res.status}`);

    const rawTicker = await res.json();
    const formatted = {};

    Object.keys(SYMBOL_MAP).forEach(ticker => {
      const targetPair = SYMBOL_MAP[ticker].binance;
      const match = rawTicker.find(item => item.symbol === targetPair);

      if (match) {
        formatted[ticker] = {
          price: parseFloat(match.lastPrice),
          change: parseFloat(match.priceChangePercent),
          symbol: ticker,
          name: SYMBOL_MAP[ticker].name,
          image: null,
          provider: 'Binance (Failover)'
        };
      }
    });

    updateCache(formatted);
    return createResponse(200, formatted, reason);
  } catch (err) {
    console.error('Binance Failover Failure:', err.message);

    // Fallback to stale cache if both providers fail
    if (state.cache) {
      return createResponse(200, state.cache, 'STALE_CACHE_FALLBACK');
    }

    return createResponse(500, { error: 'Both primary and secondary providers failed' }, 'SYSTEM_ERROR');
  }
}

/**
 * Trip the Circuit Breaker on 429
 */
function triggerCircuitBreaker(logReason) {
  console.warn(`🚨 ${logReason}. Shifting traffic to Binance for ${COOLDOWN_MS / 1000}s.`);
  state.isCoinGeckoRateLimited = true;
  state.rateLimitResetTime = Date.now() + COOLDOWN_MS;
}

/**
 * Update internal cache state
 */
function updateCache(data) {
  state.cache = data;
  state.cacheTimestamp = Date.now();
}

/**
 * Helper to build Netlify response payload
 */
function createResponse(statusCode, data, statusHeader) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=15, s-maxage=30',
      'X-Market-Provider': statusHeader
    },
    body: JSON.stringify(data)
  };
}
