/**
 * Actuarial Calculator - Life Tables, Insurance, Annuities, Pension Modeling
 * Includes: Mortality, APV, Annuities, Disability Insurance
 */

class ActuarialCalculator {
  /**
   * Simple Mortality Table (Simplified for demonstration)
   * Real tables use Society of Actuaries data
   */
  static getMortalityTable(age) {
    // Simplified mortality rates (qx) by age
    const mortalities = {
      age_0_20: 0.001,
      age_21_30: 0.0012,
      age_31_40: 0.0018,
      age_41_50: 0.004,
      age_51_60: 0.008,
      age_61_70: 0.015,
      age_71_80: 0.035,
      age_81_90: 0.08,
      age_91_100: 0.2
    };

    if (age < 21) return mortalities.age_0_20;
    if (age < 31) return mortalities.age_21_30;
    if (age < 41) return mortalities.age_31_40;
    if (age < 51) return mortalities.age_41_50;
    if (age < 61) return mortalities.age_51_60;
    if (age < 71) return mortalities.age_61_70;
    if (age < 81) return mortalities.age_71_80;
    if (age < 91) return mortalities.age_81_90;
    return mortalities.age_91_100;
  }

  /**
   * Calculate Survivorship Probability
   * nPx = probability of survival n years from age x
   */
  static survivorshipProbability(currentAge, yearsAhead) {
    let probability = 1;
    
    for (let year = 0; year < yearsAhead; year++) {
      const age = currentAge + year;
      const qx = this.getMortalityTable(age);
      const px = 1 - qx; // Survival probability for 1 year
      probability *= px;
    }
    
    return probability;
  }

  /**
   * Actuarial Present Value (APV) for annuity
   * APV = Σ (Payment × v^t × tPx)
   * where v = discount factor, tPx = survival probability
   */
  static annuityPresentValue(annualPayment, currentAge, yearsToLife, annualDiscountRate) {
    let apv = 0;
    
    for (let t = 0; t <= yearsToLife; t++) {
      const discountFactor = Math.pow(1 + annualDiscountRate, -t);
      const survivalProb = this.survivorshipProbability(currentAge, t);
      const payment = annualPayment * discountFactor * survivalProb;
      apv += payment;
    }
    
    return apv;
  }

  /**
   * Single Premium Immediate Annuity (SPIA) Pricing
   * Calculate monthly payment from lump sum at retirement
   */
  static calculateSPIA(lumpsumAmount, currentAge, annualReturnRate, useStandardTable = true) {
    let apv = 0;
    
    for (let year = 1; year <= (120 - currentAge); year++) {
      const discountFactor = Math.pow(1 + annualReturnRate, -year);
      const survivalProb = this.survivorshipProbability(currentAge, year);
      apv += discountFactor * survivalProb;
    }
    
    const annualPayment = lumpsumAmount / apv;
    const monthlyPayment = annualPayment / 12;
    
    return {
      lumpsumAmount,
      annualPayment: annualPayment.toFixed(2),
      monthlyPayment: monthlyPayment.toFixed(2),
      apv,
      expectedPayoutYears: apv // Average expected payout period
    };
  }

  /**
   * Term Life Insurance Premium Calculation
   */
  static termLifePremium(coverage, ageAtIssue, termYears, smokerStatus = 'non-smoker', healthRating = 'standard') {
    let baseRate = 0.001; // Base rate per $1000 coverage
    
    // Age loading: increases with age
    const ageLoading = 1 + ((ageAtIssue - 30) * 0.05);
    
    // Smoker rating: 2x non-smoker
    const smokerFactor = smokerStatus === 'smoker' ? 2.5 : 1;
    
    // Health rating factors
    const healthFactors = {
      'preferred': 0.85,
      'standard': 1.0,
      'standard-plus': 1.15,
      'rated': 1.5
    };
    const healthFactor = healthFactors[healthRating] || 1;
    
    // Term discount: longer terms get slight discount
    const termDiscount = termYears > 20 ? 0.95 : 1;
    
    const annualRate = baseRate * 1000 * (coverage / 100000) * ageLoading * smokerFactor * healthFactor * termDiscount;
    const monthlyRate = annualRate / 12;
    const totalPremium = monthlyRate * 12 * termYears;
    
    return {
      coverage,
      ageAtIssue,
      termYears,
      monthlyRate: monthlyRate.toFixed(2),
      annualRate: annualRate.toFixed(2),
      totalPremium: totalPremium.toFixed(2),
      costPer1000Coverage: annualRate.toFixed(2),
      ageLoading,
      smokerFactor,
      healthFactor
    };
  }

  /**
   * Whole Life Insurance Valuation
   */
  static wholeLifePremium(coverage, ageAtIssue, smokerStatus = 'non-smoker') {
    let baseRate = 0.008; // Higher rate for whole life
    
    const ageLoading = 1 + ((ageAtIssue - 30) * 0.08);
    const smokerFactor = smokerStatus === 'smoker' ? 3 : 1;
    
    const annualRate = baseRate * 1000 * (coverage / 100000) * ageLoading * smokerFactor;
    const monthlyRate = annualRate / 12;
    
    // Calculate cash value accumulation
    const years = 40; // To age ~70
    const cashValues = [];
    
    for (let year = 1; year <= years; year++) {
      // Simplified cash value formula: increases with time
      const cashValue = (coverage * 0.3) * Math.pow((year / 20), 0.5) * (1 - Math.exp(-year / 10));
      cashValues.push({
        year,
        cashValue: Math.min(cashValue, coverage * 0.9)
      });
    }
    
    return {
      coverage,
      ageAtIssue,
      monthlyRate: monthlyRate.toFixed(2),
      annualRate: annualRate.toFixed(2),
      costPer1000: annualRate.toFixed(2),
      cashValueProgression: cashValues,
      deathBenefit: coverage
    };
  }

  /**
   * Disability Income Insurance (DI) Calculator
   */
  static disabilityInsurance(monthlyIncome, replacementRatio = 0.60, ageAtIssue, waitingPeriod = 90) {
    // Most DI policies replace 50-70% of income
    const monthlyBenefit = monthlyIncome * replacementRatio;
    
    // Calculate probability of disability (simplified)
    let disabilityProbability = 0.0001; // Base rate
    if (ageAtIssue > 40) disabilityProbability *= 1.5;
    if (ageAtIssue > 50) disabilityProbability *= 2;
    
    // Premium calculation (approximately 1% of monthly benefit for standard underwriting)
    const monthlyPremium = monthlyBenefit * 0.01;
    
    // Waiting period factor (longer wait = lower premium)
    const waitingPeriodDiscount = waitingPeriod === 30 ? 1 :
                                  waitingPeriod === 90 ? 0.85 :
                                  waitingPeriod === 180 ? 0.7 :
                                  waitingPeriod === 365 ? 0.55 : 0.85;
    
    const adjustedPremium = monthlyPremium * waitingPeriodDiscount;
    
    return {
      monthlyIncome,
      monthlyBenefit,
      replacementRatio: (replacementRatio * 100).toFixed(1),
      monthlyPremium: adjustedPremium.toFixed(2),
      annualPremium: (adjustedPremium * 12).toFixed(2),
      waitingPeriodDays: waitingPeriod,
      estimatedBenefitPeriod: '60+ years',
      disabilityProbability
    };
  }

  /**
   * Defined Benefit (DB) Pension Valuation
   * PV of Future Benefit Obligation
   */
  static dbPensionValuation(finalAverageSalary, yearsOfService, retirementAge, currentAge, benefitFormula = 0.02) {
    // benefitFormula typically 1-2% × Years of Service × FAS
    // Standard formula: 2% × Years × FAS
    
    const annualBenefit = benefitFormula * yearsOfService * finalAverageSalary;
    
    // Discount rate for pension obligations (typically 4-5%)
    const discountRate = 0.045;
    
    // Years until retirement
    const yearsToRetirement = retirementAge - currentAge;
    
    // Discount the future benefit payments
    const presentValue = annualBenefit / Math.pow(1 + discountRate, yearsToRetirement);
    
    // Assume 25 year life expectancy after retirement
    const yearsInRetirement = 25;
    let liabilityValue = 0;
    
    for (let year = 0; year < yearsInRetirement; year++) {
      const survivalProb = this.survivorshipProbability(retirementAge, year);
      const discountFactor = Math.pow(1 + discountRate, -(yearsToRetirement + year));
      liabilityValue += annualBenefit * survivalProb * discountFactor;
    }
    
    return {
      finalAverageSalary,
      yearsOfService,
      benefitFormula: (benefitFormula * 100) + '%',
      annualBenefitAtRetirement: annualBenefit.toFixed(2),
      presentValueObligations: liabilityValue.toFixed(2),
      yearsToRetirement,
      liabilityPerYear: (liabilityValue / yearsOfService).toFixed(2)
    };
  }

  /**
   * Defined Contribution (DC) Accumulation
   * 401k / Mutual Fund Retirement
   */
  static dcAccumulation(annualContribution, employerMatch, years, annualReturn) {
    let balance = 0;
    const yearlyDetail = [];
    
    const employeeContribution = annualContribution;
    const matchPercent = employerMatch / 100;
    
    for (let year = 1; year <= years; year++) {
      const employeeAdd = employeeContribution;
      const employerAdd = employeeContribution * matchPercent;
      const totalContribution = employeeAdd + employerAdd;
      
      balance = balance * (1 + annualReturn) + totalContribution;
      
      yearlyDetail.push({
        year,
        employeeContribution: employeeAdd,
        employerMatch: employerAdd,
        balance,
        totalContributed: employeeAdd * year + employerAdd * year,
        earnings: balance - (employeeAdd * year + employerAdd * year)
      });
    }
    
    const totalContributions = (employeeContribution + (employeeContribution * matchPercent)) * years;
    const totalEarnings = balance - totalContributions;
    
    return {
      finalBalance: balance.toFixed(2),
      totalContributions: totalContributions.toFixed(2),
      employeeTotal: (employeeContribution * years).toFixed(2),
      employerTotal: ((employeeContribution * matchPercent) * years).toFixed(2),
      totalEarnings: totalEarnings.toFixed(2),
      earningsPercent: (totalEarnings / balance * 100).toFixed(2),
      yearlyBreakdown: yearlyDetail
    };
  }

  /**
   * Retirement Needs Analysis
   * How much required at retirement for desired income
   */
  static retirementNeeds(desiredAnnualIncome, yearsInRetirement, inflationRate, investmentReturn) {
    // Calculate required lump sum using PV of annuity with inflation
    let requiredAmount = 0;
    
    for (let year = 1; year <= yearsInRetirement; year++) {
      const inflatedIncome = desiredAnnualIncome * Math.pow(1 + inflationRate, year - 1);
      const discountedPayment = inflatedIncome / Math.pow(1 + investmentReturn, year);
      requiredAmount += discountedPayment;
    }
    
    // Safe withdrawal rate analysis (4% rule)
    const amountUsing4Percent = desiredAnnualIncome / 0.04;
    
    // Monte Carlo simulation would go here...
    const successProbability = 90; // Simplified
    
    return {
      desiredAnnualIncome,
      yearsInRetirement,
      requiredLumpSum: requiredAmount.toFixed(2),
      using4PercentRule: amountUsing4Percent.toFixed(2),
      successProbability: successProbability + '%',
      recommendation: requiredAmount > amountUsing4Percent ? 
        `Save at least $${requiredAmount.toFixed(2)} for inflation-adjusted withdrawals` :
        `$${amountUsing4Percent.toFixed(2)} sufficient using 4% rule`
    };
  }

  /**
   * Long-Term Care Insurance Need
   */
  static ltcInsuranceNeed(dailyCost, expectedYearsNeeded, ageAtIssue, inflationRate = 0.03) {
    // Inflate daily costs
    const scenarios = [
      { years: 2, label: '2 Years' },
      { years: 5, label: '5 Years' },
      { years: 10, label: '10 Years' }
    ];

    const results = scenarios.map(scenario => {
      let totalCost = 0;
      
      for (let year = 1; year <= scenario.years; year++) {
        const inflatedDaily = dailyCost * Math.pow(1 + inflationRate, year - 1);
        totalCost += inflatedDaily * 365;
      }
      
      return {
        scenario: scenario.label,
        totalCost: totalCost.toFixed(2),
        annualAverage: (totalCost / scenario.years).toFixed(2)
      };
    });

    // LTC Insurance premium (simplified)
    const ltcPremium = ((ageAtIssue / 30) * 50 * scenarios[1].years) / 12; // Per $100k benefit

    return {
      dailyCostAssumption: dailyCost,
      costScenarios: results,
      recommendedBenefit: results[1].totalCost,
      ltcInsurancePremium: ltcPremium.toFixed(2),
      criticalAge: 'Obtain before age 65'
    };
  }
}

// Export for Node/module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ActuarialCalculator;
}
