/**
 * Portfolio Analytics & Monte Carlo Simulation
 * Includes: Sharpe Ratio, VaR, CVaR, Efficient Frontier, Monte Carlo Simulation
 */

class PortfolioAnalytics {
  /**
   * Calculate Sharpe Ratio
   * Sharpe = (Return - Risk Free) / StdDev
   */
  static calculateSharpeRatio(portfolioReturn, riskFreeRate, portfolioStdDev) {
    return (portfolioReturn - riskFreeRate) / portfolioStdDev;
  }

  /**
   * Calculate Standard Deviation from returns
   */
  static calculateStdDev(returns) {
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate Correlation between two series
   */
  static calculateCorrelation(series1, series2) {
    const n = Math.min(series1.length, series2.length);
    const mean1 = series1.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const mean2 = series2.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let sumProduct = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = series1[i] - mean1;
      const diff2 = series2[i] - mean2;
      sumProduct += diff1 * diff2;
      sumSq1 += diff1 * diff1;
      sumSq2 += diff2 * diff2;
    }

    return sumProduct / Math.sqrt(sumSq1 * sumSq2);
  }

  /**
   * Calculate Covariance Matrix
   */
  static covarianceMatrix(returns) {
    // returns: {asset1: [r1, r2, ...], asset2: [r1, r2, ...], ...}
    const assets = Object.keys(returns);
    const n = assets.length;
    const cov = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          const std = this.calculateStdDev(returns[assets[i]]);
          cov[i][j] = std * std;
        } else {
          cov[i][j] = this.calculateCorrelation(returns[assets[i]], returns[assets[j]]) *
                     this.calculateStdDev(returns[assets[i]]) *
                     this.calculateStdDev(returns[assets[j]]);
        }
      }
    }

    return cov;
  }

  /**
   * Value at Risk (VaR) - Historical Simulation
   */
  static calculateVaR(returns, confidenceLevel = 0.95) {
    const sorted = returns.slice().sort((a, b) => a - b);
    const index = Math.floor((1 - confidenceLevel) * sorted.length);
    return Math.abs(sorted[index]);
  }

  /**
   * Conditional Value at Risk (CVaR / Expected Shortfall)
   */
  static calculateCVaR(returns, confidenceLevel = 0.95) {
    const sorted = returns.slice().sort((a, b) => a - b);
    const index = Math.floor((1 - confidenceLevel) * sorted.length);
    const tail = sorted.slice(0, index + 1);
    const cvar = tail.reduce((a, b) => a + b, 0) / tail.length;
    return Math.abs(cvar);
  }

  /**
   * Maximum Drawdown
   */
  static calculateMaxDrawdown(values) {
    let maxDrawdown = 0;
    let peak = values[0];

    for (let i = 1; i < values.length; i++) {
      const drawdown = (peak - values[i]) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        peak = values[i];
      } else if (values[i] > peak) {
        peak = values[i];
      }
    }

    return maxDrawdown;
  }

  /**
   * Calmar Ratio (Return / Max Drawdown)
   */
  static calculateCalmarRatio(totalReturn, maxDrawdown) {
    return maxDrawdown > 0 ? totalReturn / maxDrawdown : 0;
  }

  /**
   * Sortino Ratio (uses downside volatility)
   */
  static calculateSortinoRatio(returns, targetReturn = 0, riskFreeRate = 0) {
    const excessReturn = returns.map(r => r - targetReturn);
    
    // Downside deviation (only negative returns)
    const downside = excessReturn.filter(r => r < 0);
    const downsideVariance = downside.reduce((a, b) => a + Math.pow(b, 2), 0) / excessReturn.length;
    const downsideStdDev = Math.sqrt(downsideVariance);

    const avgReturn = excessReturn.reduce((a, b) => a + b, 0) / excessReturn.length;
    
    return downsideStdDev > 0 ? (avgReturn - riskFreeRate) / downsideStdDev : 0;
  }

  /**
   * Monte Carlo Simulation
   */
  static monteCarloSimulation(initialCapital, expectedReturn, volatility, years, simulations = 10000) {
    const paths = [];
    const yearsMonthly = years * 12;

    for (let sim = 0; sim < simulations; sim++) {
      let balance = initialCapital;
      const path = [balance];

      for (let month = 0; month < yearsMonthly; month++) {
        const randomReturn = (expectedReturn / 12) + (volatility / Math.sqrt(12)) * this.randomNormal();
        balance = balance * (1 + randomReturn);
        path.push(balance);
      }

      paths.push(balance);
    }

    // Sort results
    const sortedPaths = paths.sort((a, b) => a - b);

    // Percentiles
    const percentiles = {
      p10: sortedPaths[Math.floor(simulations * 0.10)],
      p25: sortedPaths[Math.floor(simulations * 0.25)],
      p50: sortedPaths[Math.floor(simulations * 0.50)],
      p75: sortedPaths[Math.floor(simulations * 0.75)],
      p90: sortedPaths[Math.floor(simulations * 0.90)]
    };

    const mean = paths.reduce((a, b) => a + b, 0) / simulations;
    const variance = paths.reduce((a, sum) => sum + Math.pow(a - mean, 2), 0) / simulations;

    return {
      initialCapital,
      expectedReturn: expectedReturn * 100 + '%',
      volatility: volatility * 100 + '%',
      timeHorizon: years + ' years',
      simulations,
      results: {
        mean: mean.toFixed(2),
        median: percentiles.p50.toFixed(2),
        stdDev: Math.sqrt(variance).toFixed(2),
        min: Math.min(...paths).toFixed(2),
        max: Math.max(...paths).toFixed(2),
        ...percentiles
      },
      probabilityOfSuccess: {
        reaching: initialCapital * 1.5,
        probability: ((paths.filter(p => p >= initialCapital * 1.5).length / simulations) * 100).toFixed(2)
      }
    };
  }

  /**
   * Random normal distribution (Box-Muller transform)
   */
  static randomNormal() {
    let u1, u2;
    do {
      u1 = Math.random();
    } while (u1 <= 1e-6);
    u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Stress Test Scenarios
   */
  static stressTest(portfolio, scenarios) {
    // scenarios: {name: 'crash', returns: {stock: -0.35, bond: 0.05, cash: 0.02}}
    
    return scenarios.map(scenario => {
      let portfolioReturn = 0;
      
      Object.keys(portfolio).forEach(asset => {
        const weight = portfolio[asset];
        const assetReturn = scenario.returns[asset] || 0;
        portfolioReturn += weight * assetReturn;
      });

      return {
        scenario: scenario.name,
        portfolioImpact: (portfolioReturn * 100).toFixed(2) + '%',
        loss: portfolioReturn < 0
      };
    });
  }

  /**
   * Efficient Frontier (simplified 2-asset)
   */
  static efficientFrontier(asset1Return, asset1Vol, asset2Return, asset2Vol, correlation, riskFreeRate = 0.02) {
    const frontier = [];

    for (let weight = 0; weight <= 1; weight += 0.05) {
      const w1 = weight;
      const w2 = 1 - weight;

      const portfolioReturn = (w1 * asset1Return) + (w2 * asset2Return);
      
      const portfolioVar = (w1 * w1 * asset1Vol * asset1Vol) +
                          (w2 * w2 * asset2Vol * asset2Vol) +
                          (2 * w1 * w2 * asset1Vol * asset2Vol * correlation);
      
      const portfolioVol = Math.sqrt(portfolioVar);
      const sharpe = (portfolioReturn - riskFreeRate) / portfolioVol;

      frontier.push({
        asset1Weight: (w1 * 100).toFixed(1),
        asset2Weight: (w2 * 100).toFixed(1),
        return: (portfolioReturn * 100).toFixed(2),
        volatility: (portfolioVol * 100).toFixed(2),
        sharpeRatio: sharpe.toFixed(3)
      });
    }

    // Find maximum Sharpe
    const maxSharpe = frontier.reduce((prev, current) =>
      parseFloat(prev.sharpeRatio) > parseFloat(current.sharpeRatio) ? prev : current
    );

    return {
      frontier,
      maxSharpePortfolio: maxSharpe
    };
  }

  /**
   * Risk Parity Portfolio
   */
  static riskParityAllocation(volatilities) {
    // volatilities: {asset1: 0.15, asset2: 0.10, asset3: 0.20}
    
    const assets = Object.keys(volatilities);
    const invVols = assets.map(asset => 1 / volatilities[asset]);
    const sumInvVols = invVols.reduce((a, b) => a + b, 0);

    const allocation = {};
    assets.forEach((asset, index) => {
      allocation[asset] = (invVols[index] / sumInvVols) * 100;
    });

    return {
      allocation,
      description: 'Each asset contributes equally to portfolio risk'
    };
  }
}

// Export for Node/module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PortfolioAnalytics;
}
