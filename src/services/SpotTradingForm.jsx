'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { executeSpotTrade } from '@/lib/api/trading'; // Path to your client helper function

export default function SpotTradingForm({ initialSymbol = 'BTC' }) {
  const supabase = createClientComponentClient();

  // Form state
  const [symbol, setSymbol] = useState(initialSymbol);
  const [side, setSide] = useState('BUY'); // 'BUY' | 'SELL'
  const [amount, setAmount] = useState('');

  // Market & User state
  const [marketPrice, setMarketPrice] = useState(0);
  const [usdBalance, setUsdBalance] = useState(0);
  const [cryptoBalance, setCryptoBalance] = useState(0);

  // UI status states
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [validationError, setValidationError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // 1. Fetch live market price & user balances on load / symbol change
  useEffect(() => {
    async function loadTradeContext() {
      setFetchingData(true);
      setValidationError('');
      setFeedback({ type: '', message: '' });

      try {
        // Fetch Live Market Price from backend proxy (CoinGecko/Binance)
        const priceRes = await fetch('/.netlify/functions/market-data');
        const priceData = await priceRes.json();
        if (priceData[symbol]) {
          setMarketPrice(parseFloat(priceData[symbol].price));
        }

        // Fetch user session & balances
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Fetch USD Cash Balance
          const { data: balData } = await supabase
            .from('trading_balances')
            .select('usd_balance')
            .eq('user_id', session.user.id)
            .single();

          setUsdBalance(balData ? parseFloat(balData.usd_balance) : 10000);

          // Fetch Portfolio Crypto Holding
          const { data: portData } = await supabase
            .from('trading_portfolio')
            .select('quantity')
            .eq('user_id', session.user.id)
            .eq('symbol', symbol)
            .single();

          setCryptoBalance(portData ? parseFloat(portData.quantity) : 0);
        }
      } catch (err) {
        console.error('Context fetch error:', err);
      } finally {
        setFetchingData(false);
      }
    }

    loadTradeContext();
  }, [symbol, supabase]);

  // 2. Real-time Input Validation
  const validateInput = (val, currentSide) => {
    const parsedAmount = parseFloat(val);

    if (!val || isNaN(parsedAmount) || parsedAmount <= 0) {
      return 'Please enter a valid amount greater than 0.';
    }

    const estimatedTotal = parsedAmount * marketPrice;
    const estimatedFee = estimatedTotal * 0.001; // 0.1% fee
    const totalRequired = estimatedTotal + estimatedFee;

    if (currentSide === 'BUY' && totalRequired > usdBalance) {
      return `Insufficient USD balance. Required: $${totalRequired.toFixed(2)}, Available: $${usdBalance.toFixed(2)}`;
    }

    if (currentSide === 'SELL' && parsedAmount > cryptoBalance) {
      return `Insufficient ${symbol} balance. Held: ${cryptoBalance.toFixed(6)}, Attempting: ${parsedAmount.toFixed(6)}`;
    }

    return '';
  };

  const handleAmountChange = (e) => {
    const val = e.target.value;
    setAmount(val);
    setValidationError(validateInput(val, side));
  };

  const handleSideToggle = (newSide) => {
    setSide(newSide);
    setValidationError(validateInput(amount, newSide));
  };

  // 3. Form Submission Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    const err = validateInput(amount, side);
    if (err) {
      setValidationError(err);
      return;
    }

    setLoading(true);

    try {
      // Get current Supabase Auth JWT Token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('You must be logged in to execute trades.');
      }

      // Execute Trade via Netlify Function API
      const result = await executeSpotTrade(symbol, side, parseFloat(amount), session.access_token);

      setFeedback({
        type: 'success',
        message: `Successfully ${side === 'BUY' ? 'bought' : 'sold'} ${amount} ${symbol} @ $${result.filledPrice.toLocaleString()}`
      });

      // Reset form & Refresh balances
      setAmount('');
      const newUsd = side === 'BUY' 
        ? usdBalance - (result.filledPrice * amount * 1.001)
        : usdBalance + (result.filledPrice * amount * 0.999);
      setUsdBalance(newUsd);

    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Trade execution failed.'
      });
    } finally {
      setLoading(false);
    }
  };

  const estimatedTotal = (parseFloat(amount || 0) * marketPrice);
  const estimatedFee = estimatedTotal * 0.001;

  return (
    <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-xl text-white shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Spot Trading — {symbol}</h2>
        <span className="text-sm font-semibold text-emerald-400">
          ${marketPrice ? marketPrice.toLocaleString() : '---'}
        </span>
      </div>

      {/* Side Selector (BUY / SELL) */}
      <div className="grid grid-cols-2 gap-2 p-1 mb-6 bg-slate-800 rounded-lg">
        <button
          type="button"
          onClick={() => handleSideToggle('BUY')}
          className={`py-2 text-sm font-bold rounded-md transition-all ${
            side === 'BUY' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Buy {symbol}
        </button>
        <button
          type="button"
          onClick={() => handleSideToggle('SELL')}
          className={`py-2 text-sm font-bold rounded-md transition-all ${
            side === 'SELL' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Sell {symbol}
        </button>
      </div>

      {/* Balance Display */}
      <div className="flex justify-between text-xs text-slate-400 mb-4 bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
        <span>Available USD: <strong className="text-white">${usdBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
        <span>Available {symbol}: <strong className="text-white">{cryptoBalance.toFixed(4)}</strong></span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Order Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Order Quantity ({symbol})</label>
          <div className="relative">
            <input
              type="number"
              step="any"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              disabled={loading || fetchingData}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 disabled:opacity-50 text-sm"
            />
            <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">{symbol}</span>
          </div>
        </div>

        {/* Trade Cost Estimator */}
        <div className="space-y-1 text-xs text-slate-400 pt-2 border-t border-slate-800">
          <div className="flex justify-between">
            <span>Est. Order Value:</span>
            <span className="text-slate-200">${estimatedTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Est. Fee (0.1%):</span>
            <span className="text-slate-200">${estimatedFee.toFixed(2)}</span>
          </div>
        </div>

        {/* Validation Errors */}
        {validationError && (
          <p className="text-xs text-rose-400 font-medium bg-rose-950/40 p-2 rounded border border-rose-800/50">
            {validationError}
          </p>
        )}

        {/* Success/Failure Feedback */}
        {feedback.message && (
          <p className={`text-xs p-2 rounded border font-medium ${
            feedback.type === 'success' 
              ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50' 
              : 'text-rose-400 bg-rose-950/40 border-rose-800/50'
          }`}>
            {feedback.message}
          </p>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !!validationError || !amount || fetchingData}
          className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex justify-center items-center ${
            side === 'BUY'
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-rose-600 hover:bg-rose-500 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Executing Order...
            </span>
          ) : (
            `${side} ${symbol}`
          )}
        </button>
      </form>
    </div>
  );
}
