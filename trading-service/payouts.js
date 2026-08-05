const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const DATA_PATH = path.join(__dirname, 'data', 'db.json');
const PAYOUTS_PATH = path.join(__dirname, 'data', 'payouts.json');

function loadData() { return JSON.parse(fs.readFileSync(DATA_PATH)); }
function savePayouts(d) { fs.writeFileSync(PAYOUTS_PATH, JSON.stringify(d, null, 2)); }

function queuePayout({ toAddress, amountTokens, tokenSymbol = 'SIM' }) {
  let payouts = [];
  try { payouts = JSON.parse(fs.readFileSync(PAYOUTS_PATH)); } catch (e) { payouts = []; }
  const item = { id: Date.now().toString(), toAddress, amountTokens, tokenSymbol, status: 'queued', createdAt: new Date().toISOString() };
  payouts.push(item);
  savePayouts(payouts);
  return item;
}

// NOTE: This is scaffolding only. Real on-chain payouts require secure key management and gas funding.
async function processPayouts({ providerUrl, privateKey, tokenContractAddress }) {
  const payouts = JSON.parse(fs.readFileSync(PAYOUTS_PATH));
  if (!providerUrl || !privateKey || !tokenContractAddress) throw new Error('missing_ethereum_config');
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const abi = ["function transfer(address to, uint amount) public returns (bool)"];
  const token = new ethers.Contract(tokenContractAddress, abi, wallet);
  for (const p of payouts.filter(x => x.status === 'queued')) {
    try {
      p.status = 'processing';
      savePayouts(payouts);
      const tx = await token.transfer(p.toAddress, ethers.utils.parseUnits(String(p.amountTokens), 18));
      p.txHash = tx.hash;
      p.status = 'sent';
      savePayouts(payouts);
    } catch (e) {
      p.status = 'error';
      p.error = String(e.message || e);
      savePayouts(payouts);
    }
  }
  return payouts;
}

module.exports = { queuePayout, processPayouts };
