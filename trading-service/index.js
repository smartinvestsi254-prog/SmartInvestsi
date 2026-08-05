const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const shortid = require('shortid');

const app = express();
const cors = require('cors');
const { getPrice } = require('./market-data');
const { queuePayout } = require('./payouts');
const { pensionProjection, recommendPensionAction } = require('./financial-calculators');
const premium = require('./premium-calculators');
app.use(cors());
app.use(bodyParser.json());

// serve admin UI
app.use('/admin', express.static(path.join(__dirname)));

const DATA_PATH = path.join(__dirname, 'data', 'db.json');
const CONFIG_PATH = path.join(__dirname, 'config.json');

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH)); } catch (e) { return { FEE_PERCENTAGE: 0.1, ADMIN_ACCOUNT_ID: 'admin' }; }
}

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_PATH));
}

function saveData(d) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(d, null, 2));
}

function ensureAccount(data, accountId) {
  if (!data.accounts[accountId]) data.accounts[accountId] = { cash: 0, tokens: 0, positions: {} };
}

async function executeOrder({ userId, symbol, side, qty, price }) {
  const data = loadData();
  const cfg = loadConfig();
  ensureAccount(data, userId);
  ensureAccount(data, cfg.ADMIN_ACCOUNT_ID);
  // resolve market price if not supplied
  if (!price) {
    price = await getPrice(symbol);
  }
  const notional = qty * price;
  const fee = (cfg.FEE_PERCENTAGE / 100) * notional;

  if (side === 'buy') {
    if (data.accounts[userId].cash < notional + fee) {
      return { error: 'insufficient_cash' };
    }
    data.accounts[userId].cash -= notional + fee;
    data.accounts[userId].positions[symbol] = (data.accounts[userId].positions[symbol] || 0) + qty;
  } else if (side === 'sell') {
    const held = data.accounts[userId].positions[symbol] || 0;
    if (held < qty) return { error: 'insufficient_shares' };
    data.accounts[userId].positions[symbol] = held - qty;
    data.accounts[userId].cash += notional - fee;
  } else {
    return { error: 'invalid_side' };
  }

  data.accounts[cfg.ADMIN_ACCOUNT_ID].tokens += fee; // fee credited as tokens to admin (internal tokens)

  const trade = {
    id: shortid.generate(),
    userId,
    symbol,
    side,
    qty,
    price,
    notional,
    fee,
    timestamp: new Date().toISOString()
  };
  data.trades.push(trade);
  saveData(data);
  return { trade };
}

app.get('/api/v1/account/:id', (req, res) => {
  const data = loadData();
  const acc = data.accounts[req.params.id];
  if (!acc) return res.status(404).json({ error: 'not_found' });
  res.json(acc);
});

app.post('/api/v1/order', async (req, res) => {
  const { userId = 'user1', symbol, side, qty, price } = req.body;
  if (!symbol || !side || !qty) return res.status(400).json({ error: 'missing_fields' });
  try {
    const result = await executeOrder({ userId, symbol, side, qty, price });
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

// Endpoint for receiving TradingView-style alerts/signals
app.post('/api/v1/signals', async (req, res) => {
  // expected: { userId?, symbol, side, qty?, price? }
  const { userId = 'user1', symbol, side } = req.body;
  const qty = req.body.qty || 1;
  const price = req.body.price || undefined;
  if (!symbol || !side) return res.status(400).json({ error: 'missing_fields' });
  try {
    const result = await executeOrder({ userId, symbol, side, qty, price });
    if (result.error) return res.status(400).json(result);
    res.json({ accepted: true, trade: result.trade });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

// Marketplace: register user wallet
app.post('/api/v1/marketplace/register', (req, res) => {
  const { userId, walletAddress } = req.body;
  if (!userId) return res.status(400).json({ error: 'missing_userId' });
  const data = loadData();
  data.marketplace.users[userId] = data.marketplace.users[userId] || {};
  if (walletAddress) data.marketplace.users[userId].wallet = walletAddress;
  saveData(data);
  res.json({ ok: true, user: data.marketplace.users[userId] });
});

// Marketplace: create listing
app.post('/api/v1/marketplace/list', (req, res) => {
  const { userId, title, description, price } = req.body;
  if (!userId || !title) return res.status(400).json({ error: 'missing_fields' });
  const data = loadData();
  const item = { id: shortid.generate(), userId, title, description: description || '', price: price || 0, createdAt: new Date().toISOString() };
  data.marketplace.listings.push(item);
  saveData(data);
  res.json(item);
});

app.post('/api/v1/marketplace/bid', (req, res) => {
  const { userId, listingId, amount } = req.body;
  if (!userId || !listingId || !amount) return res.status(400).json({ error: 'missing_fields' });
  const data = loadData();
  const bid = { id: shortid.generate(), userId, listingId, amount, createdAt: new Date().toISOString() };
  data.marketplace.bids.push(bid);
  saveData(data);
  res.json(bid);
});

app.post('/api/v1/marketplace/message', (req, res) => {
  const { from, to, text } = req.body;
  if (!from || !to || !text) return res.status(400).json({ error: 'missing_fields' });
  const data = loadData();
  const msg = { id: shortid.generate(), from, to, text, createdAt: new Date().toISOString() };
  data.marketplace.messages.push(msg);
  saveData(data);
  res.json(msg);
});

// Payout queue (internal token ledger -> queue to send on-chain)
app.post('/api/v1/payouts/queue', (req, res) => {
  const { toAddress, amountTokens } = req.body;
  if (!toAddress || !amountTokens) return res.status(400).json({ error: 'missing_fields' });
  const p = queuePayout({ toAddress, amountTokens });
  res.json(p);
});

// Financial calculators
app.post('/api/v1/calculators/pension', (req, res) => {
  const params = req.body || {};
  try {
    const out = pensionProjection(params);
    res.json(out);
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

app.post('/api/v1/calculators/pension/recommend', (req, res) => {
  const params = req.body || {};
  try {
    const out = recommendPensionAction(params);
    res.json(out);
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});

// Premium calculator endpoints
app.post('/api/v1/calculators/premium/npv', (req, res) => {
  const { rate, cashflows } = req.body || {};
  if (typeof rate !== 'number' || !Array.isArray(cashflows)) return res.status(400).json({ error: 'missing_fields' });
  res.json({ npv: premium.npv(rate, cashflows) });
});

app.post('/api/v1/calculators/premium/irr', (req, res) => {
  const { cashflows } = req.body || {};
  if (!Array.isArray(cashflows)) return res.status(400).json({ error: 'missing_fields' });
  res.json({ irr: premium.irr(cashflows) });
});

app.post('/api/v1/calculators/premium/amortization', (req, res) => {
  const params = req.body || {};
  res.json(premium.amortizationSchedule(params));
});

app.post('/api/v1/calculators/premium/montecarlo', (req, res) => {
  const params = req.body || {};
  res.json(premium.monteCarloProjection(params));
});

app.post('/api/v1/calculators/premium/insurance/term', (req, res) => {
  const params = req.body || {};
  if (typeof params.age !== 'number' || typeof params.years !== 'number' || !Array.isArray(params.mortalityRates)) return res.status(400).json({ error: 'missing_fields' });
  res.json(premium.termLifePremium(params));
});

app.get('/api/v1/admin/ledger', (req, res) => {
  const data = loadData();
  const cfg = loadConfig();
  const admin = data.accounts[cfg.ADMIN_ACCOUNT_ID] || { cash: 0, tokens: 0 };
  res.json({ admin, trades: data.trades });
});

app.get('/api/v1/status', (req, res) => res.json({ status: 'ok', now: new Date().toISOString() }));

const port = process.env.PORT || 4002;
app.listen(port, () => console.log(`Trading-sim listening on ${port}`));
