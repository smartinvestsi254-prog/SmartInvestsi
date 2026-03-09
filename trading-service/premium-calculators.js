// Premium-tier financial & actuarial calculators
// Exports: npv, irr, amortizationSchedule, monteCarloProjection, capmReturn, bondPrice, termLifePremium

function npv(rate, cashflows) {
  return cashflows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + rate, i + 1), 0);
}

function irr(cashflows, guess = 0.1) {
  const maxIter = 1000;
  const tol = 1e-6;
  let x0 = guess;
  function f(r) { return cashflows.reduce((s, c, i) => s + c / Math.pow(1 + r, i + 1), 0); }
  function df(r) { return cashflows.reduce((s, c, i) => s - (i + 1) * c / Math.pow(1 + r, i + 2), 0); }
  for (let i = 0; i < maxIter; i++) {
    const y = f(x0);
    const y1 = df(x0);
    if (Math.abs(y1) < 1e-12) break;
    const x1 = x0 - y / y1;
    if (Math.abs(x1 - x0) < tol) return x1;
    x0 = x1;
  }
  return x0;
}

function amortizationSchedule({ principal, annualRate, years, paymentsPerYear = 12 }) {
  const n = years * paymentsPerYear;
  const r = annualRate / paymentsPerYear;
  const payment = principal * (r / (1 - Math.pow(1 + r, -n)));
  const schedule = [];
  let balance = principal;
  for (let i = 1; i <= n; i++) {
    const interest = balance * r;
    const principalPaid = payment - interest;
    balance -= principalPaid;
    schedule.push({ period: i, payment, interest, principalPaid, balance: Math.max(0, balance) });
  }
  return { payment, schedule };
}

function monteCarloProjection({ startValue, annualReturn = 0.07, volatility = 0.15, years = 30, sims = 1000 }) {
  const steps = years;
  const results = [];
  for (let s = 0; s < sims; s++) {
    let v = startValue;
    for (let t = 0; t < steps; t++) {
      const shock = Math.exp((annualReturn - 0.5 * volatility * volatility) + volatility * randn_bm());
      v *= shock;
    }
    results.push(v);
  }
  results.sort((a, b) => a - b);
  return { median: results[Math.floor(sims / 2)], p10: results[Math.floor(sims * 0.1)], p90: results[Math.floor(sims * 0.9)], all: results };
}

function randn_bm() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function capmReturn({ riskFree = 0.02, beta = 1, marketReturn = 0.07 }) {
  return riskFree + beta * (marketReturn - riskFree);
}

function bondPrice({ face = 1000, couponRate = 0.05, marketYield = 0.04, years = 10, freq = 2 }) {
  const c = face * couponRate / freq;
  const n = years * freq;
  const y = marketYield / freq;
  let pv = 0;
  for (let i = 1; i <= n; i++) pv += c / Math.pow(1 + y, i);
  pv += face / Math.pow(1 + y, n);
  return pv;
}

// Simple term life premium (level annual premium), using given mortality rates array and interest rate
function termLifePremium({ age, years, mortalityRates /* array of q_x for each future year starting at age */, interest = 0.03, sumAssured = 100000 }) {
  // Net single premium approximation via discounted probabilities
  let v = 1 / (1 + interest);
  let np = 0;
  for (let t = 0; t < years; t++) {
    const q = mortalityRates[t] || 0;
    const disc = Math.pow(v, t + 1);
    np += q * disc * sumAssured;
  }
  // level annual premium via approximate annuity factor (a-double-dot)
  const a = (1 - Math.pow(1 / (1 + interest), years)) / interest;
  const annual = np / a;
  return { netSinglePremium: np, annualLevelPremium: annual };
}

module.exports = { npv, irr, amortizationSchedule, monteCarloProjection, capmReturn, bondPrice, termLifePremium };
