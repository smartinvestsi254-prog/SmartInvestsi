/**
 * Netlify Function: Spot Trade Execution Engine
 * Endpoint: /.netlify/functions/spot-trade
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.APP_URL || 'https://yourdomain.com',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TRADING_FEE_PERCENT = 0.001; // 0.1% simulation fee

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    // 1. Authenticate user JWT from Authorization header
    const token = event.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: Missing token' }) };
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid authentication token' }) };
    }

    const { symbol, side, amount, type } = JSON.parse(event.body || '{}');

    if (!symbol || !side || !amount || amount <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid parameters provided' }) };
    }

    // 2. Fetch real-time mark price from your market-data endpoint
    const host = event.headers.host;
    const protocol = event.headers['x-forwarded-proto'] || 'http';
    const priceRes = await fetch(`${protocol}://${host}/.netlify/functions/market-data`);
    const prices = await priceRes.json();

    const targetCoin = prices[symbol.toUpperCase()];
    if (!targetCoin || !targetCoin.price) {
      return { statusCode: 400, body: JSON.stringify({ error: `Market price for ${symbol} unavailable.` }) };
    }

    const currentPrice = parseFloat(targetCoin.price);
    const grossTotal = currentPrice * parseFloat(amount);
    const fee = grossTotal * TRADING_FEE_PERCENT;
    const netTotalUSD = side === 'BUY' ? grossTotal + fee : grossTotal - fee;

    // 3. Fetch User's Current USD Balance
    let { data: balanceRecord } = await supabase
      .from('trading_balances')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Initialize $10,000 demo wallet if new user
    if (!balanceRecord) {
      const { data: newBal } = await supabase
        .from('trading_balances')
        .insert({ user_id: user.id, usd_balance: 10000.00 })
        .select()
        .single();
      balanceRecord = newBal;
    }

    // 4. BUY Logic Execution
    if (side === 'BUY') {
      if (parseFloat(balanceRecord.usd_balance) < netTotalUSD) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Insufficient USD balance for trade' }) };
      }

      // Deduct USD Balance
      const newUsdBal = parseFloat(balanceRecord.usd_balance) - netTotalUSD;
      await supabase
        .from('trading_balances')
        .update({ usd_balance: newUsdBal, updated_at: new Date() })
        .eq('user_id', user.id);

      // Upsert Asset Holding Portfolio
      const { data: existingHolding } = await supabase
        .from('trading_portfolio')
        .select('*')
        .eq('user_id', user.id)
        .eq('symbol', symbol.toUpperCase())
        .single();

      if (existingHolding) {
        const oldQty = parseFloat(existingHolding.quantity);
        const oldAvg = parseFloat(existingHolding.avg_buy_price);
        const newQty = oldQty + parseFloat(amount);
        const newAvg = ((oldQty * oldAvg) + grossTotal) / newQty;

        await supabase
          .from('trading_portfolio')
          .update({ quantity: newQty, avg_buy_price: newAvg, updated_at: new Date() })
          .eq('id', existingHolding.id);
      } else {
        await supabase
          .from('trading_portfolio')
          .insert({
            user_id: user.id,
            symbol: symbol.toUpperCase(),
            quantity: parseFloat(amount),
            avg_buy_price: currentPrice
          });
      }
    } 

    // 5. SELL Logic Execution
    else if (side === 'SELL') {
      const { data: existingHolding } = await supabase
        .from('trading_portfolio')
        .select('*')
        .eq('user_id', user.id)
        .eq('symbol', symbol.toUpperCase())
        .single();

      if (!existingHolding || parseFloat(existingHolding.quantity) < parseFloat(amount)) {
        return { statusCode: 400, body: JSON.stringify({ error: `Insufficient ${symbol} balance to sell` }) };
      }

      const newQty = parseFloat(existingHolding.quantity) - parseFloat(amount);
      const newUsdBal = parseFloat(balanceRecord.usd_balance) + netTotalUSD;

      // Credit USD Balance
      await supabase
        .from('trading_balances')
        .update({ usd_balance: newUsdBal, updated_at: new Date() })
        .eq('user_id', user.id);

      // Update or Remove Portfolio Position
      if (newQty <= 0.00000001) {
        await supabase.from('trading_portfolio').delete().eq('id', existingHolding.id);
      } else {
        await supabase
          .from('trading_portfolio')
          .update({ quantity: newQty, updated_at: new Date() })
          .eq('id', existingHolding.id);
      }
    }

    // 6. Record Execution in Order History
    const { data: orderRecord } = await supabase
      .from('trading_orders')
      .insert({
        user_id: user.id,
        symbol: symbol.toUpperCase(),
        side,
        type: type || 'MARKET',
        amount: parseFloat(amount),
        price: currentPrice,
        total: grossTotal,
        fee: fee,
        status: 'EXECUTED'
      })
      .select()
      .single();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Order executed successfully',
        order: orderRecord,
        filledPrice: currentPrice,
        feeCharged: fee
      })
    };

  } catch (err) {
    console.error('Trade Execution Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal trade execution failure' }) };
  }
};
