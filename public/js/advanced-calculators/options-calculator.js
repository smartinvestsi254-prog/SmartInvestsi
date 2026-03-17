/**
 * Options Calculator - Black-Scholes Option Pricing & Greeks
 * Includes: Call/Put Pricing, Greeks (Delta, Gamma, Theta, Vega, Rho)
 * Option Strategies: Straddle, Strangle, Collar, Spreads
 */

class OptionsCalculator {
  /**
   * Standard Normal Distribution CDF (Φ)
   */
  static cumulativeNormalDistribution(x) {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Standard Normal Probability Density Function (φ)
   */
  static standardNormalPDF(x) {
    return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
  }

  /**
   * Calculate d1 and d2 for Black-Scholes
   */
  static calculateD1D2(spotPrice, strikePrice, timeToMaturity, riskFreeRate, volatility) {
    const d1 = (Math.log(spotPrice / strikePrice) + 
                (riskFreeRate + 0.5 * volatility * volatility) * timeToMaturity) / 
               (volatility * Math.sqrt(timeToMaturity));
    
    const d2 = d1 - volatility * Math.sqrt(timeToMaturity);
    
    return { d1, d2 };
  }

  /**
   * Black-Scholes Call Option Price
   * C = S₀×N(d₁) - K×e^(-rT)×N(d₂)
   */
  static callOptionPrice(spotPrice, strikePrice, timeToMaturity, riskFreeRate, volatility) {
    const { d1, d2 } = this.calculateD1D2(spotPrice, strikePrice, timeToMaturity, riskFreeRate, volatility);
    
    return (spotPrice * this.cumulativeNormalDistribution(d1)) - 
           (strikePrice * Math.exp(-riskFreeRate * timeToMaturity) * this.cumulativeNormalDistribution(d2));
  }

  /**
   * Black-Scholes Put Option Price
   * P = K×e^(-rT)×N(-d₂) - S₀×N(-d₁)
   */
  static putOptionPrice(spotPrice, strikePrice, timeToMaturity, riskFreeRate, volatility) {
    const { d1, d2 } = this.calculateD1D2(spotPrice, strikePrice, timeToMaturity, riskFreeRate, volatility);
    
    return (strikePrice * Math.exp(-riskFreeRate * timeToMaturity) * this.cumulativeNormalDistribution(-d2)) - 
           (spotPrice * this.cumulativeNormalDistribution(-d1));
  }

  /**
   * Calculate Option Greeks
   */
  static calculateGreeks(spotPrice, strikePrice, timeToMaturity, riskFreeRate, volatility, optionType = 'call') {
    const { d1, d2 } = this.calculateD1D2(spotPrice, strikePrice, timeToMaturity, riskFreeRate, volatility);
    const sqrtT = Math.sqrt(timeToMaturity);
    const pdf_d1 = this.standardNormalPDF(d1);

    const greeks = {
      // Delta: Rate of change of option price with respect to spot price
      delta: optionType === 'call' ? this.cumulativeNormalDistribution(d1) : 
             (this.cumulativeNormalDistribution(d1) - 1),

      // Gamma: Rate of change of delta
      gamma: pdf_d1 / (spotPrice * volatility * sqrtT),

      // Theta: Rate of change with respect to time (daily theta)
      theta: optionType === 'call' ? 
        -(spotPrice * pdf_d1 * volatility) / (2 * sqrtT) - 
        (riskFreeRate * strikePrice * Math.exp(-riskFreeRate * timeToMaturity) * this.cumulativeNormalDistribution(d2)) :
        -(spotPrice * pdf_d1 * volatility) / (2 * sqrtT) + 
        (riskFreeRate * strikePrice * Math.exp(-riskFreeRate * timeToMaturity) * this.cumulativeNormalDistribution(-d2)),

      // Vega: Rate of change with respect to volatility (per 1% change)
      vega: spotPrice * pdf_d1 * sqrtT / 100,

      // Rho: Rate of change with respect to interest rate (per 1% change)
      rho: optionType === 'call' ? 
        (strikePrice * timeToMaturity * Math.exp(-riskFreeRate * timeToMaturity) * this.cumulativeNormalDistribution(d2)) / 100 :
        (-strikePrice * timeToMaturity * Math.exp(-riskFreeRate * timeToMaturity) * this.cumulativeNormalDistribution(-d2)) / 100
    };

    return greeks;
  }

  /**
   * Calculate Implied Volatility using Newton-Raphson method
   */
  static calculateImpliedVolatility(observedPrice, spotPrice, strikePrice, timeToMaturity, riskFreeRate, optionType = 'call') {
    let sigma = 0.2; // Initial guess
    const tolerance = 0.0001;
    
    for (let i = 0; i < 100; i++) {
      const priceAtSigma = optionType === 'call' ? 
        this.callOptionPrice(spotPrice, strikePrice, timeToMaturity, riskFreeRate, sigma) :
        this.putOptionPrice(spotPrice, strikePrice, timeToMaturity, riskFreeRate, sigma);
      
      const diff = priceAtSigma - observedPrice;
      
      if (Math.abs(diff) < tolerance) break;
      
      // Vega as derivative
      const greeks = this.calculateGreeks(spotPrice, strikePrice, timeToMaturity, riskFreeRate, sigma, optionType);
      const vega = greeks.vega * 100;
      
      sigma = sigma - (diff / vega);
      
      if (sigma < 0) sigma = 0.001;
    }
    
    return sigma;
  }

  /**
   * Straddle Strategy Analysis
   * Long straddle: Buy call + buy put, same strike
   */
  static straddleAnalysis(spotPrice, strikePrice, timeToMaturity, riskFreeRate, volatility) {
    const callPrice = this.callOptionPrice(spotPrice, strikePrice, timeToMaturity, riskFreeRate, volatility);
    const putPrice = this.putOptionPrice(spotPrice, strikePrice, timeToMaturity, riskFreeRate, volatility);
    const totalCost = callPrice + putPrice;
    
    // Break-even points
    const breakEvenUp = strikePrice + totalCost;
    const breakEvenDown = strikePrice - totalCost;
    
    return {
      callPrice,
      putPrice,
      totalCost,
      breakEvenUp,
      breakEvenDown,
      maxProfit: Infinity,
      maxLoss: totalCost,
      profitableRange: `< ${breakEvenDown.toFixed(2)} or > ${breakEvenUp.toFixed(2)}`
    };
  }

  /**
   * Bull Call Spread Analysis
   * Buy call at lower strike + sell call at higher strike
   */
  static bullCallSpreadAnalysis(spotPrice, lowerStrike, upperStrike, timeToMaturity, riskFreeRate, volatility) {
    const buyCall = this.callOptionPrice(spotPrice, lowerStrike, timeToMaturity, riskFreeRate, volatility);
    const sellCall = this.callOptionPrice(spotPrice, upperStrike, timeToMaturity, riskFreeRate, volatility);
    const netCost = buyCall - sellCall;
    
    const breakEven = lowerStrike + netCost;
    const maxProfit = upperStrike - lowerStrike - netCost;
    
    return {
      buyCallPrice: buyCall,
      sellCallPrice: sellCall,
      netCost,
      breakEven,
      maxProfit,
      maxLoss: netCost,
      profitRange: `${breakEven.toFixed(2)} to ${upperStrike.toFixed(2)}`
    };
  }

  /**
   * Iron Condor Strategy Analysis
   * Sell call spread + sell put spread, different strikes
   */
  static ironCondorAnalysis(spotPrice, putStrike, shortCallStrike, longCallStrike, timeToMaturity, riskFreeRate, volatility) {
    const longPut = this.putOptionPrice(spotPrice, putStrike - (shortCallStrike - putStrike), timeToMaturity, riskFreeRate, volatility);
    const shortPut = this.putOptionPrice(spotPrice, putStrike, timeToMaturity, riskFreeRate, volatility);
    const shortCall = this.callOptionPrice(spotPrice, shortCallStrike, timeToMaturity, riskFreeRate, volatility);
    const longCall = this.callOptionPrice(spotPrice, longCallStrike, timeToMaturity, riskFreeRate, volatility);
    
    const netCredit = (shortPut - longPut) + (shortCall - longCall);
    const width = shortCallStrike - putStrike;
    const maxProfit = netCredit;
    const maxLoss = width - netCredit;
    
    return {
      netCredit,
      maxProfit,
      maxLoss,
      width,
      profitZone: `Between ${putStrike.toFixed(2)} and ${shortCallStrike.toFixed(2)}`
    };
  }

  /**
   * Collar Strategy Analysis
   * Own stock + buy put + sell call (hedge with limited upside)
   */
  static collarAnalysis(stockPrice, stockQuantity, putStrike, callStrike, timeToMaturity, riskFreeRate, volatility) {
    const putCost = this.putOptionPrice(stockPrice, putStrike, timeToMaturity, riskFreeRate, volatility);
    const callIncome = this.callOptionPrice(stockPrice, callStrike, timeToMaturity, riskFreeRate, volatility);
    const netCost = putCost - callIncome;
    
    const floorValue = putStrike * stockQuantity;
    const ceilValue = callStrike * stockQuantity;
    
    return {
      stockCost: stockPrice * stockQuantity,
      putCost: putCost * stockQuantity,
      callIncome: callIncome * stockQuantity,
      netHedgeCost: netCost * stockQuantity,
      floor: floorValue,
      ceil: ceilValue,
      protectionCost: (netCost / stockPrice) * 100 // % of stock price
    };
  }

  /**
   * Binomial Option Pricing (American options)
   */
  static binomialOptionPrice(spotPrice, strikePrice, timeToMaturity, riskFreeRate, volatility, steps = 100, optionType = 'call', isAmerican = true) {
    const dt = timeToMaturity / steps;
    const u = Math.exp(volatility * Math.sqrt(dt)); // Up factor
    const d = 1 / u; // Down factor
    const p = (Math.exp(riskFreeRate * dt) - d) / (u - d); // Risk-neutral probability

    // Initialize stock prices at final nodes
    const prices = [];
    for (let i = 0; i <= steps; i++) {
      prices[i] = spotPrice * Math.pow(u, steps - i) * Math.pow(d, i);
    }

    // Initialize option values at final nodes
    const option = [];
    for (let i = 0; i <= steps; i++) {
      if (optionType === 'call') {
        option[i] = Math.max(prices[i] - strikePrice, 0);
      } else {
        option[i] = Math.max(strikePrice - prices[i], 0);
      }
    }

    // Backward induction through the tree
    for (let j = steps - 1; j >= 0; j--) {
      for (let i = 0; i <= j; i++) {
        const intrinsicValue = optionType === 'call' 
          ? Math.max(spotPrice * Math.pow(u, j - i) * Math.pow(d, i) - strikePrice, 0)
          : Math.max(strikePrice - spotPrice * Math.pow(u, j - i) * Math.pow(d, i), 0);

        option[i] = Math.exp(-riskFreeRate * dt) * (p * option[i] + (1 - p) * option[i + 1]);

        // For American options, check for early exercise
        if (isAmerican) {
          option[i] = Math.max(option[i], intrinsicValue);
        }
      }
    }

    return option[0];
  }

  /**
   * Synthetic Stock Position (Call - Put at same strike)
   */
  static syntheticStockAnalysis(callPrice, putPrice, strikePrice, timeToMaturity, riskFreeRate) {
    const syntheticCost = callPrice - putPrice;
    const theoreticalValue = strikePrice * Math.exp(-riskFreeRate * timeToMaturity);
    const arbitrage = syntheticCost - theoreticalValue;
    
    return {
      syntheticCost,
      theoreticalValue,
      arbitrage,
      hasArbitrage: Math.abs(arbitrage) > 0.01
    };
  }
}

// Export for Node/module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OptionsCalculator;
}
