const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH)); } catch (e) { return {}; }
}

// Simple market data fetcher. Supports AlphaVantage or fallback to random price.
async function getPrice(symbol) {
  const cfg = loadConfig();
  // Example provider: ALPHAVANTAGE_API_KEY
  if (process.env.ALPHAVANTAGE_API_KEY) {
    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${process.env.ALPHAVANTAGE_API_KEY}`;
      const r = await axios.get(url, { timeout: 5000 });
      const p = r.data && r.data['Global Quote'] && r.data['Global Quote']['05. price'];
      if (p) return parseFloat(p);
    } catch (e) { /* ignore and fallback */ }
  }

  // IEX, Finnhub, etc. can be added with API keys in config.
  if (process.env.IEX_API_KEY) {
    try {
      const url = `https://cloud.iexapis.com/stable/stock/${encodeURIComponent(symbol)}/quote?token=${process.env.IEX_API_KEY}`;
      const r = await axios.get(url, { timeout: 5000 });
      if (r.data && r.data.latestPrice) return parseFloat(r.data.latestPrice);
    } catch (e) { }
  }

  // fallback: small simulated price
  return (Math.random() * 100) + 1;
}

module.exports = { getPrice };
