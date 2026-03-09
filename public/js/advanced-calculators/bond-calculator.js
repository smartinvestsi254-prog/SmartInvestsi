/**
 * Bond Calculator - Financial Bond Analysis Tools
 * Includes: YTM, Duration, Convexity, Pricing, Callable Bonds
 */

class BondCalculator {
  /**
   * Calculate Bond Price using Present Value of Cash Flows
   * Formula: P = Σ(C/(1+y)^t) + FV/(1+y)^T
   */
  static calculateBondPrice(parValue, couponRate, yieldRate, yearsToMaturity, frequency = 2) {
    const periods = yearsToMaturity * frequency;
    const couponPayment = (parValue * couponRate) / frequency;
    const yieldPerPeriod = yieldRate / frequency;
    
    let price = 0;
    for (let t = 1; t <= periods; t++) {
      price += couponPayment / Math.pow(1 + yieldPerPeriod, t);
    }
    price += parValue / Math.pow(1 + yieldPerPeriod, periods);
    
    return price;
  }

  /**
   * Calculate Yield to Maturity (YTM) using Newton-Raphson method
   */
  static calculateYTM(currentPrice, parValue, couponRate, yearsToMaturity, frequency = 2) {
    let ytm = couponRate; // Initial guess
    const couponPayment = (parValue * couponRate) / frequency;
    const periods = yearsToMaturity * frequency;

    for (let i = 0; i < 100; i++) {
      const yieldPerPeriod = ytm / frequency;
      
      // Calculate bond price at current ytm
      let price = 0;
      let priceDerivative = 0;
      
      for (let t = 1; t <= periods; t++) {
        price += couponPayment / Math.pow(1 + yieldPerPeriod, t);
        priceDerivative -= (t * couponPayment) / Math.pow(1 + yieldPerPeriod, t + 1);
      }
      
      price += parValue / Math.pow(1 + yieldPerPeriod, periods);
      priceDerivative -= (periods * parValue) / Math.pow(1 + yieldPerPeriod, periods + 1);
      
      const diff = currentPrice - price;
      
      if (Math.abs(diff) < 0.01) break;
      
      ytm = ytm + (diff / Math.abs(priceDerivative)) * (frequency / 100);
    }
    
    return ytm;
  }

  /**
   * Calculate Macaulay Duration
   * Formula: D = Σ(t * CF_t) / (P * (1+y)) where CF_t are discounted cash flows
   */
  static calculateMacaulayDuration(parValue, couponRate, yieldRate, yearsToMaturity, frequency = 2) {
    const couponPayment = (parValue * couponRate) / frequency;
    const yieldPerPeriod = yieldRate / frequency;
    const periods = yearsToMaturity * frequency;
    const price = this.calculateBondPrice(parValue, couponRate, yieldRate, yearsToMaturity, frequency);

    let weightedCashFlow = 0;
    
    for (let t = 1; t <= periods; t++) {
      const cf = couponPayment / Math.pow(1 + yieldPerPeriod, t);
      weightedCashFlow += (t / frequency) * cf;
    }
    
    const fv = parValue / Math.pow(1 + yieldPerPeriod, periods);
    weightedCashFlow += yearsToMaturity * fv;
    
    return weightedCashFlow / price;
  }

  /**
   * Calculate Modified Duration
   * Formula: Modified Duration = Macaulay Duration / (1 + y/frequency)
   */
  static calculateModifiedDuration(macaulayDuration, yieldRate, frequency = 2) {
    return macaulayDuration / (1 + yieldRate / frequency);
  }

  /**
   * Calculate Bond Convexity
   */
  static calculateConvexity(parValue, couponRate, yieldRate, yearsToMaturity, frequency = 2) {
    const couponPayment = (parValue * couponRate) / frequency;
    const yieldPerPeriod = yieldRate / frequency;
    const periods = yearsToMaturity * frequency;
    const price = this.calculateBondPrice(parValue, couponRate, yieldRate, yearsToMaturity, frequency);

    let convexity = 0;
    
    for (let t = 1; t <= periods; t++) {
      const cf = couponPayment / Math.pow(1 + yieldPerPeriod, t + 2);
      convexity += t * (t + 1) * cf;
    }
    
    const fv = parValue / Math.pow(1 + yieldPerPeriod, periods + 2);
    convexity += periods * (periods + 1) * fv;
    
    convexity = convexity / (price * Math.pow(1 + yieldPerPeriod, 2) * Math.pow(frequency, 2));
    
    return convexity;
  }

  /**
   * Estimate Bond Price Change from yield change using Duration and Convexity
   * ΔP ≈ -D × P × Δy + (1/2) × C × P × (Δy)²
   */
  static estimatePriceChange(currentPrice, modifiedDuration, convexity, yieldChange) {
    const durationEffect = -modifiedDuration * currentPrice * yieldChange;
    const convexityEffect = 0.5 * convexity * currentPrice * Math.pow(yieldChange, 2);
    
    return {
      totalChange: durationEffect + convexityEffect,
      durationEffect,
      convexityEffect,
      percentageChange: ((durationEffect + convexityEffect) / currentPrice) * 100
    };
  }

  /**
   * Calculate Option-Adjusted Spread (OAS) for corporate bonds
   */
  static calculateOAS(bondPrice, riskFreeYield, parValue, couponRate, yearsToMaturity) {
    const theoreticalPrice = this.calculateBondPrice(parValue, couponRate, riskFreeYield, yearsToMaturity);
    const ytm = this.calculateYTM(bondPrice, parValue, couponRate, yearsToMaturity);
    
    return (ytm - riskFreeYield) * 10000; // in basis points
  }

  /**
   * Calculate Callable Bond adjustments
   */
  static calculateCallableAdjustment(optionValue, bondDuration, volatility, yearsToCall) {
    // Simplified option-adjusted spread calculation
    const timeValue = 0.5 * Math.pow(volatility * Math.sqrt(yearsToCall), 2);
    
    return {
      optionCost: optionValue,
      adjustedDuration: bondDuration * (1 - optionValue / 100),
      callRisk: Math.pow(volatility, 2) * yearsToCall
    };
  }

  /**
   * Bond Ladder Construction
   */
  static constructLadder(totalAmount, yearsToMaturity, rungs = 5) {
    const ladder = [];
    const amountPerRung = totalAmount / rungs;
    const yearsPerRung = yearsToMaturity / rungs;
    
    for (let i = 0; i < rungs; i++) {
      ladder.push({
        rung: i + 1,
        amount: amountPerRung,
        maturityYears: (i + 1) * yearsPerRung,
        rescueAmount: amountPerRung // Available to reinvest at maturity
      });
    }
    
    return ladder;
  }

  /**
   * Interest Rate Risk Analysis
   */
  static analyzeInterestRateRisk(parValue, couponRate, currentYield, yearsToMaturity) {
    const currentPrice = this.calculateBondPrice(parValue, couponRate, currentYield, yearsToMaturity);
    const modDuration = this.calculateModifiedDuration(
      this.calculateMacaulayDuration(parValue, couponRate, currentYield, yearsToMaturity),
      currentYield
    );
    
    // Scenarios: -200bp, -100bp, +100bp, +200bp
    const scenarios = [-200, -100, 100, 200].map(bps => {
      const newYield = currentYield + (bps / 10000);
      const newPrice = this.calculateBondPrice(parValue, couponRate, newYield, yearsToMaturity);
      return {
        scenario: `${bps > 0 ? '+' : ''}${bps}bp`,
        newPrice,
        priceChange: newPrice - currentPrice,
        percentageChange: ((newPrice - currentPrice) / currentPrice) * 100
      };
    });
    
    return { currentPrice, scenarios };
  }
}

// Export for Node/module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BondCalculator;
}
