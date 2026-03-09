/**
 * Cryptocurrency Calculator Suite
 * Includes: DCA, Staking, DeFi Yield, Leverage, Volatility, Tax Optimization
 */

class CryptoCalculator {
  /**
   * Dollar-Cost Averaging (DCA) Analysis
   * Compare DCA vs. Lump Sum investment
   */
  static dcaAnalysis(totalAmount, investmentFrequency, historicalPrices) {
    // investmentFrequency in months (1, 3, 6, 12)
    // historicalPrices: array of {date, price} ordered chronologically
    
    const dcaAmount = totalAmount / historicalPrices.length;
    let dcaCoins = 0;
    let dcaCost = 0;

    historicalPrices.forEach((point, index) => {
      if ((index) % investmentFrequency === 0) {
        dcaCoins += dcaAmount / point.price;
        dcaCost += dcaAmount;
      }
    });

    // Lump sum at start
    const lumpSumCoins = totalAmount / historicalPrices[0].price;
    const currentPrice = historicalPrices[historicalPrices.length - 1].price;

    return {
      dca: {
        investmentAmount: dcaCost,
        coinsAcquired: dcaCoins,
        averageCost: dcaCost / dcaCoins,
        currentValue: dcaCoins * currentPrice,
        gain: (dcaCoins * currentPrice) - dcaCost,
        gainPercent: ((dcaCoins * currentPrice) - dcaCost) / dcaCost * 100
      },
      lumpSum: {
        investmentAmount: totalAmount,
        coinsAcquired: lumpSumCoins,
        averageCost: totalAmount / lumpSumCoins,
        currentValue: lumpSumCoins * currentPrice,
        gain: (lumpSumCoins * currentPrice) - totalAmount,
        gainPercent: ((lumpSumCoins * currentPrice) - totalAmount) / totalAmount * 100
      },
      outperformance: {
        winner: (dcaCoins * currentPrice) > (lumpSumCoins * currentPrice) ? 'DCA' : 'Lump Sum',
        difference: Math.abs((dcaCoins * currentPrice) - (lumpSumCoins * currentPrice)),
        percentDifference: Math.abs(
          (((dcaCoins * currentPrice) - (lumpSumCoins * currentPrice)) / (lumpSumCoins * currentPrice)) * 100
        )
      }
    };
  }

  /**
   * Staking Rewards Calculator with Compounding
   */
  static stakingRewards(principalAmount, annualReturnRate, compoundingFrequency, years) {
    // compoundingFrequency: 'daily' (365), 'weekly' (52), 'monthly' (12)
    const frequencies = {
      'daily': 365,
      'weekly': 52,
      'monthly': 12,
      'annual': 1
    };

    const n = frequencies[compoundingFrequency] || 365;
    const r = annualReturnRate / 100;
    
    const finalAmount = principalAmount * Math.pow(1 + r / n, n * years);
    const totalInterest = finalAmount - principalAmount;

    // Break down by year
    const yearlyBreakdown = [];
    for (let year = 1; year <= years; year++) {
      const yearAmount = principalAmount * Math.pow(1 + r / n, n * year);
      const yearInterest = yearAmount - (year === 1 ? principalAmount : 
        principalAmount * Math.pow(1 + r / n, n * (year - 1)));
      
      yearlyBreakdown.push({
        year,
        balance: yearAmount,
        yearlyReward: yearInterest,
        cumulativeReward: yearAmount - principalAmount
      });
    }

    return {
      principal: principalAmount,
      finalAmount,
      totalRewards: totalInterest,
      rewardPercent: (totalInterest / principalAmount) * 100,
      yearlyBreakdown,
      taxableEvents: totalInterest // Total taxable as income
    };
  }

  /**
   * DeFi Impermanent Loss Calculator
   * IL = 2*sqrt(r)/(1+r) - 1, where r = price ratio change
   */
  static calculateImpermanentLoss(initialTokenAPrice, initialTokenBPrice, finalTokenAPrice, finalTokenBPrice, liquidityProvided) {
    const initialRatio = initialTokenAPrice / initialTokenBPrice;
    const finalRatio = finalTokenAPrice / finalTokenBPrice;
    
    const priceRatioChange = finalRatio / initialRatio;
    
    // IL formula: 2*sqrt(r)/(1+r) - 1
    const impermanentLossPercent = ((2 * Math.sqrt(priceRatioChange)) / (1 + priceRatioChange) - 1) * 100;
    
    const ilAmount = liquidityProvided * (impermanentLossPercent / 100);
    
    return {
      priceRatioChange,
      impermanentLossPercent,
      impermanentLossAmount: ilAmount,
      recoveryNeeded: liquidityProvided + ilAmount,
      breakEvenYield: Math.abs(impermanentLossPercent)
    };
  }

  /**
   * DeFi Yield vs. IL Analysis
   */
  static defiYieldAnalysis(principalAmount, lpTokenAPrice, lpTokenBPrice, apy, yearsActive) {
    const liquidityValue = principalAmount;
    
    // Simulate price movement scenarios
    const scenarios = [
      { name: 'Stable (No Change)', priceChange: 0 },
      { name: 'Moderate Upside (+25%)', priceChange: 0.25 },
      { name: 'Bull Market (+100%)', priceChange: 1.0 },
      { name: 'Crash (-50%)', priceChange: -0.5 }
    ];

    return scenarios.map(scenario => {
      const newTokenAPrice = lpTokenAPrice * (1 + scenario.priceChange);
      const newTokenBPrice = lpTokenBPrice * (1 + scenario.priceChange);
      
      const il = this.calculateImpermanentLoss(
        lpTokenAPrice,
        lpTokenBPrice,
        newTokenAPrice,
        newTokenBPrice,
        liquidityValue
      );

      const yields = this.stakingRewards(liquidityValue, apy, 'daily', yearsActive);
      const netProfit = yields.totalRewards - il.impermanentLossAmount;
      const netAPY = (netProfit / liquidityValue) * (365 / (yearsActive * 365)) * 100;

      return {
        scenario: scenario.name,
        priceChange: scenario.priceChange * 100,
        impermanentLoss: il.impermanentLossAmount,
        stakedRewards: yields.totalRewards,
        netProfit,
        netAPY,
        worthIt: netProfit > 0
      };
    });
  }

  /**
   * Leverage/Margin Trading Calculator
   */
  static leverageCalculation(initialCapital, leverage, entryPrice, exitPrice, fees = 0.001) {
    const positionSize = initialCapital * leverage;
    const coinsHeld = positionSize / entryPrice;
    
    const unrealizedPnL = coinsHeld * (exitPrice - entryPrice);
    const totalFees = positionSize * fees;
    const realizedPnL = unrealizedPnL - totalFees;
    
    const returnPercent = (realizedPnL / initialCapital) * 100;
    
    // Liquidation price (if 80% margin requirement)
    const maintenanceMargin = 0.2;
    const liquidationPrice = entryPrice * (1 - (leverage * maintenanceMargin) / (leverage - 1));
    
    return {
      initialCapital,
      leverage,
      positionSize,
      coinsHeld,
      entryPrice,
      exitPrice,
      unrealizedPnL,
      totalFees,
      realizedPnL,
      returnPercent,
      liquidationPrice,
      liquidationDistance: Math.abs((liquidationPrice - entryPrice) / entryPrice * 100),
      riskRewardRatio: Math.abs(unrealizedPnL / (initialCapital * leverage * (1 - maintenanceMargin)))
    };
  }

  /**
   * Crypto Volatility Analysis
   * Calculate historical and implied volatility
   */
  static volatilityAnalysis(priceHistory) {
    // priceHistory: array of prices
    const returns = [];
    
    for (let i = 1; i < priceHistory.length; i++) {
      const dailyReturn = Math.log(priceHistory[i] / priceHistory[i - 1]);
      returns.push(dailyReturn);
    }

    // Calculate standard deviation
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const dailyVolatility = Math.sqrt(variance);
    
    // Annualized volatility (252 trading days)
    const annualizedVolatility = dailyVolatility * Math.sqrt(252);
    
    // Standard deviation of returns
    const stdDevDaily = Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1));
    
    return {
      dailyVolatility,
      annualizedVolatility,
      stdDevDaily,
      priceRange: {
        min: Math.min(...priceHistory),
        max: Math.max(...priceHistory),
        range: Math.max(...priceHistory) - Math.min(...priceHistory)
      },
      volatilityLevel: annualizedVolatility > 0.8 ? 'Very High' : 
                      annualizedVolatility > 0.5 ? 'High' :
                      annualizedVolatility > 0.25 ? 'Moderate' : 'Low'
    };
  }

  /**
   * Tax-Loss Harvesting for Crypto
   */
  static taxLossHarvesting(positions, currentPrices, taxRate, minLagDays = 30) {
    const harvestingOpportunities = [];
    
    positions.forEach((position, index) => {
      const currentPrice = currentPrices[index];
      const loss = (position.costBasis - currentPrice) * position.quantity;
      const taxBenefit = loss * taxRate;
      
      // Check wash sale rule (simplified - 30 day rule)
      const daysHeld = position.daysSincePurchase;
      
      if (loss < 0 && daysHeld > minLagDays) {
        harvestingOpportunities.push({
          asset: position.symbol,
          costBasis: position.costBasis,
          currentPrice,
          quantity: position.quantity,
          unrealizedLoss: loss,
          potentialTaxBenefit: taxBenefit,
          washSaleRisk: daysHeld < minLagDays,
          harvestRecommended: taxBenefit > 10 // Only if benefit > $10
        });
      }
    });

    const totalTaxBenefit = harvestingOpportunities
      .filter(o => o.harvestRecommended)
      .reduce((sum, o) => sum + o.potentialTaxBenefit, 0);

    return {
      opportunities: harvestingOpportunities,
      totalPotentialTaxBenefit: totalTaxBenefit,
      count: harvestingOpportunities.length,
      urgentCount: harvestingOpportunities.filter(o => o.daysSinceTrade > 300).length
    };
  }

  /**
   * Bitcoin Average Cost Basis (FIFO method)
   */
  static costBasisFIFO(transactions) {
    // transactions: {type: 'buy'|'sell', quantity, price, date}
    const holdings = [];
    const soldRecords = [];

    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    transactions.forEach(tx => {
      if (tx.type === 'buy') {
        holdings.push({
          quantity: tx.quantity,
          price: tx.price,
          costBasis: tx.quantity * tx.price,
          purchaseDate: tx.date
        });
      } else if (tx.type === 'sell') {
        let remainingToSell = tx.quantity;
        
        while (remainingToSell > 0 && holdings.length > 0) {
          const batch = holdings[0];
          const sellQuantity = Math.min(batch.quantity, remainingToSell);
          
          soldRecords.push({
            soldQuantity: sellQuantity,
            costPerUnit: batch.price,
            soldPrice: tx.price,
            gain: (tx.price - batch.price) * sellQuantity,
            purchaseDate: batch.purchaseDate,
            saleDate: tx.date
          });

          batch.quantity -= sellQuantity;
          remainingToSell -= sellQuantity;
          
          if (batch.quantity === 0) {
            holdings.shift();
          }
        }
      }
    });

    const totalGain = soldRecords.reduce((sum, r) => sum + r.gain, 0);
    const totalCost = soldRecords.reduce((sum, r) => sum + r.costPerUnit * r.soldQuantity, 0);
    const totalRevenue = soldRecords.reduce((sum, r) => sum + r.soldPrice * r.soldQuantity, 0);

    return {
      soldTransactions: soldRecords,
      remainingHoldings: holdings,
      totalRealizedGain: totalGain,
      totalCostBasis: totalCost,
      totalRevenue,
      percentageReturn: (totalGain / totalCost) * 100
    };
  }

  /**
   * Portfolio Rebalancing for Crypto
   */
  static rebalancingAnalysis(portfolio, targetAllocation) {
    // portfolio: {symbol, quantity, price}
    // targetAllocation: {symbol, percent}
    
    const totalValue = portfolio.reduce((sum, p) => sum + (p.quantity * p.price), 0);
    
    const rebalancing = portfolio.map(position => {
      const currentValue = position.quantity * position.price;
      const currentPercent = (currentValue / totalValue) * 100;
      const target = targetAllocation.find(t => t.symbol === position.symbol);
      const targetPercent = target ? target.percent : 0;
      const difference = targetPercent - currentPercent;
      const dollarDifference = (difference / 100) * totalValue;
      
      return {
        symbol: position.symbol,
        currentPercent,
        targetPercent,
        difference,
        action: Math.abs(difference) > 2 ? 
          (dollarDifference > 0 ? 'BUY' : 'SELL') : 'HOLD',
        amount: Math.abs(dollarDifference),
        quantity: Math.abs(dollarDifference / position.price)
      };
    });

    return {
      totalPortfolioValue: totalValue,
      rebalancingNeeded: rebalancing.some(r => r.action !== 'HOLD'),
      transactions: rebalancing.filter(r => r.action !== 'HOLD'),
      summary: rebalancing
    };
  }
}

// Export for Node/module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CryptoCalculator;
}
