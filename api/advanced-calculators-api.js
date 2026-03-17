/**
 * Advanced Calculators API Routes
 * Provides REST endpoints for premium tier financial calculators
 * Bond, Options, Cryptocurrency, Actuarial, and Portfolio Analytics
 */

const express = require('express');
const router = express.Router();

// Import calculator modules
const BondCalculator = require('../public/js/advanced-calculators/bond-calculator.js');
const OptionsCalculator = require('../public/js/advanced-calculators/options-calculator.js');
const CryptoCalculator = require('../public/js/advanced-calculators/crypto-calculator.js');
const ActuarialCalculator = require('../public/js/advanced-calculators/actuarial-calculator.js');
const PortfolioAnalytics = require('../public/js/advanced-calculators/portfolio-analytics.js');

// Middleware to verify premium tier access
const verifyPremiumAccess = (req, res, next) => {
  // Check if user has premium tier subscription
  if (req.user && req.user.isPremium) {
    next();
  } else {
    res.status(403).json({ error: 'Premium tier access required' });
  }
};

// ==================== BOND CALCULATOR ENDPOINTS ====================

/**
 * POST /api/calculators/bond/price
 * Calculate bond price given yield
 */
router.post('/bond/price', verifyPremiumAccess, (req, res) => {
  try {
    const { couponPayment, yieldRate, yearsToMaturity, faceValue, frequency } = req.body;
    
    const price = BondCalculator.calculateBondPrice(
      couponPayment,
      yieldRate,
      yearsToMaturity,
      faceValue,
      frequency
    );
    
    res.json({
      success: true,
      data: {
        bondPrice: price,
        pricePct: ((price / faceValue) * 100).toFixed(2),
        premium: price > faceValue ? (price - faceValue).toFixed(2) : null,
        discount: price < faceValue ? (faceValue - price).toFixed(2) : null
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/calculators/bond/ytm
 * Calculate bond Yield To Maturity
 */
router.post('/bond/ytm', verifyPremiumAccess, (req, res) => {
  try {
    const { currentPrice, couponPayment, yearsToMaturity, faceValue, frequency } = req.body;
    
    const ytm = BondCalculator.calculateYTM(
      currentPrice,
      couponPayment,
      yearsToMaturity,
      faceValue,
      frequency
    );
    
    res.json({
      success: true,
      data: {
        yieldToMaturity: (ytm * 100).toFixed(4),
        ytmPercentage: (ytm * 100).toFixed(2),
        totalReturn: (ytm * yearsToMaturity * 100).toFixed(2)
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/calculators/bond/duration
 * Calculate bond duration and convexity
 */
router.post('/bond/duration', verifyPremiumAccess, (req, res) => {
  try {
    const { couponPayment, currentYield, yearsToMaturity, faceValue, frequency } = req.body;
    
    const macaulayDuration = BondCalculator.calculateMacaulayDuration(
      couponPayment,
      currentYield,
      yearsToMaturity,
      faceValue,
      frequency
    );
    
    const modifiedDuration = BondCalculator.calculateModifiedDuration(
      macaulayDuration,
      currentYield,
      frequency
    );
    
    const convexity = BondCalculator.calculateConvexity(
      couponPayment,
      currentYield,
      yearsToMaturity,
      faceValue,
      frequency
    );
    
    res.json({
      success: true,
      data: {
        macaulayDuration: macaulayDuration.toFixed(4),
        modifiedDuration: modifiedDuration.toFixed(4),
        convexity: convexity.toFixed(4),
        priceChangePerYield: (modifiedDuration * -1).toFixed(4)
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/calculators/bond/oas
 * Calculate Option-Adjusted Spread
 */
router.post('/bond/oas', verifyPremiumAccess, (req, res) => {
  try {
    const { currentPrice, couponPayment, yearsToMaturity, faceValue, riskFreeRate, frequency } = req.body;
    
    const oas = BondCalculator.calculateOAS(
      currentPrice,
      couponPayment,
      yearsToMaturity,
      faceValue,
      riskFreeRate,
      frequency
    );
    
    res.json({
      success: true,
      data: {
        oasInBasisPoints: (oas * 10000).toFixed(2),
        spreadPercentage: (oas * 100).toFixed(4),
        spreadCompensation: 'Yield above risk-free rate'
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/calculators/bond/ladder
 * Construct bond ladder strategy
 */
router.post('/bond/ladder', verifyPremiumAccess, (req, res) => {
  try {
    const { totalInvestment, numberOfRungs, yearsToMaturity } = req.body;
    
    const ladder = BondCalculator.constructLadder(totalInvestment, numberOfRungs, yearsToMaturity);
    
    res.json({
      success: true,
      data: {
        ladder,
        totalInvested: totalInvestment,
        diversification: 'Spread across maturity dates',
        strategy: 'Reduce reinvestment risk'
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== OPTIONS CALCULATOR ENDPOINTS ====================

/**
 * POST /api/calculators/options/price
 * Calculate option prices using Black-Scholes
 */
router.post('/options/price', verifyPremiumAccess, (req, res) => {
  try {
    const { spotPrice, strikePrice, timeToMaturity, riskFreeRate, volatility, dividendYield, optionType } = req.body;
    
    const d1d2 = OptionsCalculator.calculateD1D2(
      spotPrice,
      strikePrice,
      timeToMaturity,
      riskFreeRate,
      volatility
    );
    
    let price;
    if (optionType.toLowerCase() === 'call') {
      price = OptionsCalculator.callOptionPrice(
        spotPrice,
        strikePrice,
        timeToMaturity,
        riskFreeRate,
        volatility
      );
    } else {
      price = OptionsCalculator.putOptionPrice(
        spotPrice,
        strikePrice,
        timeToMaturity,
        riskFreeRate,
        volatility
      );
    }
    
    res.json({
      success: true,
      data: {
        optionPrice: price.toFixed(4),
        optionType,
        d1: d1d2.d1.toFixed(4),
        d2: d1d2.d2.toFixed(4),
        intrinsicValue: (Math.abs(spotPrice - strikePrice)).toFixed(4),
        timeValue: (price - Math.abs(spotPrice - strikePrice)).toFixed(4)
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/calculators/options/greeks
 * Calculate option Greeks (Delta, Gamma, Theta, Vega, Rho)
 */
router.post('/options/greeks', verifyPremiumAccess, (req, res) => {
  try {
    const { spotPrice, strikePrice, timeToMaturity, riskFreeRate, volatility, optionType } = req.body;
    
    const greeks = OptionsCalculator.calculateGreeks(
      spotPrice,
      strikePrice,
      timeToMaturity,
      riskFreeRate,
      volatility,
      optionType
    );
    
    res.json({
      success: true,
      data: {
        delta: greeks.delta.toFixed(4),
        gamma: greeks.gamma.toFixed(6),
        theta: greeks.theta.toFixed(4),
        vega: greeks.vega.toFixed(4),
        rho: greeks.rho.toFixed(4),
        interpretation: {
          delta: 'Price change per $1 move in underlying',
          gamma: 'Rate of delta change',
          theta: 'Daily time decay in dollars',
          vega: 'Price change per 1% volatility increase',
          rho: 'Price change per 1% rate change'
        }
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/calculators/options/strategy
 * Analyze option strategies (Straddle, Bull Call Spread, Iron Condor, etc.)
 */
router.post('/options/strategy', verifyPremiumAccess, (req, res) => {
  try {
    const { strategyType, spotPrice, lowerStrike, upperStrike, timeToMaturity, riskFreeRate, volatility } = req.body;
    
    let result;
    
    switch (strategyType.toLowerCase()) {
      case 'straddle':
        result = OptionsCalculator.straddleAnalysis(
          spotPrice,
          lowerStrike,
          timeToMaturity,
          riskFreeRate,
          volatility
        );
        break;
      case 'bullcallspread':
        result = OptionsCalculator.bullCallSpreadAnalysis(
          spotPrice,
          lowerStrike,
          upperStrike,
          timeToMaturity,
          riskFreeRate,
          volatility
        );
        break;
      case 'ironcondor':
        result = OptionsCalculator.ironCondorAnalysis(
          spotPrice,
          lowerStrike,
          upperStrike,
          timeToMaturity,
          riskFreeRate,
          volatility
        );
        break;
      case 'collar':
        result = OptionsCalculator.collarAnalysis(
          spotPrice,
          lowerStrike,
          upperStrike,
          timeToMaturity,
          riskFreeRate,
          volatility
        );
        break;
      default:
        throw new Error(`Unknown strategy: ${strategyType}`);
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== CRYPTO CALCULATOR ENDPOINTS ====================

/**
 * POST /api/calculators/crypto/dca
 * Dollar-Cost Averaging analysis
 */
router.post('/crypto/dca', verifyPremiumAccess, (req, res) => {
  try {
    const { monthlyInvestment, months, averagePrice, historicalPrices } = req.body;
    
    const dcaResult = CryptoCalculator.dcaAnalysis(
      monthlyInvestment,
      months,
      averagePrice,
      historicalPrices
    );
    
    res.json({
      success: true,
      data: dcaResult
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/calculators/crypto/staking
 * Staking rewards calculation
 */
router.post('/crypto/staking', verifyPremiumAccess, (req, res) => {
  try {
    const { stakedAmount, apy, years } = req.body;
    
    const stakingResult = CryptoCalculator.stakingRewards(stakedAmount, apy, years);
    
    res.json({
      success: true,
      data: stakingResult
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/calculators/crypto/impermanent-loss
 * Calculate impermanent loss for liquidity providers
 */
router.post('/crypto/impermanent-loss', verifyPremiumAccess, (req, res) => {
  try {
    const { initialPriceRatio, finalPriceRatio } = req.body;
    
    const il = CryptoCalculator.calculateImpermanentLoss(initialPriceRatio, finalPriceRatio);
    
    res.json({
      success: true,
      data: {
        impermanentLoss: (il * 100).toFixed(2),
        lossPercentage: (il * 100).toFixed(2),
        priceRatioChange: (finalPriceRatio / initialPriceRatio).toFixed(4),
        warning: il > -0.05 ? null : 'Consider withdrawing from pool'
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/calculators/crypto/defi-yield
 * Analyze DeFi yield opportunities
 */
router.post('/crypto/defi-yield', verifyPremiumAccess, (req, res) => {
  try {
    const { investedAmount, currentPrice, apy } = req.body;
    
    const yieldAnalysis = CryptoCalculator.defiYieldAnalysis(investedAmount, currentPrice, apy);
    
    res.json({
      success: true,
      data: yieldAnalysis
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/calculators/crypto/tax-optimization
 * Calculate tax loss harvesting opportunities
 */
router.post('/crypto/tax-optimization', verifyPremiumAccess, (req, res) => {
  try {
    const { holdings } = req.body;
    
    const taxResult = CryptoCalculator.taxLossHarvesting(holdings);
    
    res.json({
      success: true,
      data: taxResult
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== ACTUARIAL CALCULATOR ENDPOINTS ====================

/**
 * POST /api/calculators/actuarial/life-insurance
 * Calculate term life insurance premium
 */
router.post('/actuarial/life-insurance', verifyPremiumAccess, (req, res) => {
  try {
    const { age, term, deathBenefit, isSmoker, healthStatus } = req.body;
    
    const termPremium = ActuarialCalculator.termLifePremium(
      age,
      term,
      deathBenefit,
      isSmoker,
      healthStatus
    );
    
    const monthlyPremium = termPremium / 12;
    
    res.json({
      success: true,
      data: {
        annualPremium: termPremium.toFixed(2),
        monthlyPremium: monthlyPremium.toFixed(2),
        totalCostOverTerm: (termPremium * term).toFixed(2),
        costPerThousandBenefit: ((termPremium / (deathBenefit / 1000)) * 12).toFixed(2)
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/calculators/actuarial/annuity
 * Calculate annuity present value and SPIA quotes
 */
router.post('/actuarial/annuity', verifyPremiumAccess, (req, res) => {
  try {
    const { monthlyPayment, years, discountRate } = req.body;
    
    const apv = ActuarialCalculator.annuityPresentValue(monthlyPayment, years, discountRate);
    
    res.json({
      success: true,
      data: {
        presentValue: apv.toFixed(2),
        totalPayments: (monthlyPayment * 12 * years).toFixed(2),
        timeValue: (monthlyPayment * 12 * years - apv).toFixed(2),
        costPerDollarIncome: (apv / (monthlyPayment * 12 * years) * 100).toFixed(2)
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/calculators/actuarial/retirement
 * Calculate retirement needs and sufficiency
 */
router.post('/actuarial/retirement', verifyPremiumAccess, (req, res) => {
  try {
    const { currentAge, retirementAge, desiredIncome, lifeExpectancy, inflationRate } = req.body;
    
    const retirementNeeds = ActuarialCalculator.retirementNeeds(
      currentAge,
      retirementAge,
      desiredIncome,
      lifeExpectancy,
      inflationRate
    );
    
    res.json({
      success: true,
      data: {
        lumpSumNeeded: retirementNeeds.toFixed(2),
        yearsInRetirement: (lifeExpectancy - retirementAge),
        inflationAdjustedIncome: (desiredIncome * Math.pow(1 + inflationRate, retirementAge - currentAge)).toFixed(2)
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== PORTFOLIO ANALYTICS ENDPOINTS ====================

/**
 * POST /api/calculators/portfolio/sharpe-ratio
 * Calculate portfolio Sharpe ratio
 */
router.post('/portfolio/sharpe-ratio', verifyPremiumAccess, (req, res) => {
  try {
    const { returns, riskFreeRate } = req.body;
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = PortfolioAnalytics.calculateStdDev(returns);
    const sharpeRatio = PortfolioAnalytics.calculateSharpeRatio(avgReturn, stdDev, riskFreeRate);
    
    res.json({
      success: true,
      data: {
        sharpeRatio: sharpeRatio.toFixed(4),
        excessReturn: ((avgReturn - riskFreeRate) * 100).toFixed(2),
        standardDeviation: (stdDev * 100).toFixed(2),
        riskAdjustedReturn: 'Risk-free rate adjusted returns'
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/calculators/portfolio/var
 * Calculate Value at Risk
 */
router.post('/portfolio/var', verifyPremiumAccess, (req, res) => {
  try {
    const { portfolioValue, returns, confidenceLevel = 0.95 } = req.body;
    
    const var95 = PortfolioAnalytics.calculateVaR(returns, 0.95);
    const var99 = PortfolioAnalytics.calculateVaR(returns, 0.99);
    const cvar95 = PortfolioAnalytics.calculateCVaR(returns, 0.95);
    
    res.json({
      success: true,
      data: {
        var95Percentage: (var95 * 100).toFixed(2),
        var95Dollar: (portfolioValue * var95).toFixed(2),
        var99Percentage: (var99 * 100).toFixed(2),
        var99Dollar: (portfolioValue * var99).toFixed(2),
        cvar95Percentage: (cvar95 * 100).toFixed(2),
        cvar95Dollar: (portfolioValue * cvar95).toFixed(2),
        interpretation: 'Maximum expected loss at confidence level'
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/calculators/portfolio/monte-carlo
 * Run Monte Carlo simulation
 */
router.post('/portfolio/monte-carlo', verifyPremiumAccess, (req, res) => {
  try {
    const { initialValue, expectedReturn, volatility, years, simulations = 10000 } = req.body;
    
    const mcsimulation = PortfolioAnalytics.monteCarloSimulation(
      initialValue,
      expectedReturn,
      volatility,
      years,
      simulations
    );
    
    res.json({
      success: true,
      data: {
        medianValue: mcsimulation.median.toFixed(2),
        percentile5: mcsimulation.percentile5.toFixed(2),
        percentile95: mcsimulation.percentile95.toFixed(2),
        meanValue: mcsimulation.mean.toFixed(2),
        bestCase: mcsimulation.max.toFixed(2),
        worstCase: mcsimulation.min.toFixed(2),
        simulations
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/calculators/portfolio/efficient-frontier
 * Calculate efficient frontier optimization
 */
router.post('/portfolio/efficient-frontier', verifyPremiumAccess, (req, res) => {
  try {
    const { asset1Return, asset1StdDev, asset2Return, asset2StdDev, correlation, riskFreeRate } = req.body;
    
    const frontier = PortfolioAnalytics.efficientFrontier(
      asset1Return,
      asset1StdDev,
      asset2Return,
      asset2StdDev,
      correlation,
      riskFreeRate
    );
    
    res.json({
      success: true,
      data: {
        optimalAllocation: {
          asset1Weight: (frontier.optimalAllocation * 100).toFixed(2),
          asset2Weight: ((1 - frontier.optimalAllocation) * 100).toFixed(2)
        },
        optimalSharpe: frontier.optimalSharpe.toFixed(4),
        frontier: frontier.frontier.slice(0, 20) // Return sample of frontier points
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/calculators/portfolio/stress-test
 * Run portfolio stress tests
 */
router.post('/portfolio/stress-test', verifyPremiumAccess, (req, res) => {
  try {
    const { portfolioValue, assetAllocation } = req.body;
    
    const stressTests = PortfolioAnalytics.stressTest(portfolioValue, assetAllocation);
    
    res.json({
      success: true,
      data: {
        scenarios: stressTests,
        portfolioValue,
        disclaimer: 'Scenarios are hypothetical and do not predict future results'
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
