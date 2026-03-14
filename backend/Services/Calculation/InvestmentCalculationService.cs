using System;
using System.Collections.Generic;
using System.Linq;

namespace SmartInvest.Services.Calculation
{
    public interface IInvestmentCalculationService
    {
        decimal CalculateCompoundInterest(decimal principal, decimal rate, int years, int compoundingFrequency);
        decimal CalculateFutureValue(decimal principal, decimal monthlyContribution, decimal annualRate, int years);
        decimal CalculateRequiredSavings(decimal targetAmount, decimal annualRate, int years);
        ROIResult CalculateROI(decimal initialInvestment, decimal currentValue, int years);
        RiskMetrics CalculateRiskMetrics(List<decimal> returns);
        TaxCalculation CalculateTax(decimal income, string region);
    }

    public class InvestmentCalculationService : IInvestmentCalculationService
    {
        // Compound Interest: A = P(1 + r/n)^(nt)
        public decimal CalculateCompoundInterest(decimal principal, decimal rate, int years, int compoundingFrequency)
        {
            var rateDecimal = (double)(rate / 100);
            var n = compoundingFrequency; // 1=annually, 12=monthly, 365=daily
            var t = years;
            
            var amount = (decimal)(Math.Pow(1 + rateDecimal / n, n * t));
            return principal * amount;
        }

        // Future Value with Monthly Contributions
        public decimal CalculateFutureValue(decimal principal, decimal monthlyContribution, decimal annualRate, int years)
        {
            var monthlyRate = (double)(annualRate / 100 / 12);
            var months = years * 12;
            
            var fvPrincipal = (decimal)(Math.Pow(1 + monthlyRate, months));
            var principalValue = principal * fvPrincipal;
            
            if (monthlyRate > 0)
            {
                var contributionValue = monthlyContribution * 
                    (decimal)((Math.Pow(1 + monthlyRate, months) - 1) / monthlyRate);
                return principalValue + contributionValue;
            }
            
            return principalValue + (monthlyContribution * months);
        }

        // Required Savings to Reach Target
        public decimal CalculateRequiredSavings(decimal targetAmount, decimal annualRate, int years)
        {
            var monthlyRate = (double)(annualRate / 100 / 12);
            var months = years * 12;
            
            if (monthlyRate > 0)
            {
                var denominator = (decimal)((Math.Pow(1 + monthlyRate, months) - 1) / monthlyRate);
                return targetAmount / denominator;
            }
            
            return targetAmount / months;
        }

        // Return on Investment with CAGR
        public ROIResult CalculateROI(decimal initialInvestment, decimal currentValue, int years)
        {
            var totalReturn = currentValue - initialInvestment;
            var simpleROI = (totalReturn / initialInvestment) * 100;
            var cagr = (decimal)(Math.Pow((double)(currentValue / initialInvestment), 1.0 / years) - 1) * 100;
            
            return new ROIResult
            {
                TotalReturn = totalReturn,
                SimpleROI = simpleROI,
                CAGR = cagr,
                Years = years
            };
        }

        // Risk Metrics: Standard Deviation, Sharpe Ratio
        public RiskMetrics CalculateRiskMetrics(List<decimal> returns)
        {
            if (returns == null || returns.Count < 2)
                return new RiskMetrics();

            var mean = returns.Average();
            var variance = returns.Sum(r => Math.Pow((double)(r - mean), 2)) / (returns.Count - 1);
            var standardDeviation = (decimal)Math.Sqrt(variance);
            
            var riskFreeRate = 0.05m;
            var sharpeRatio = standardDeviation > 0 ? (mean - riskFreeRate) / standardDeviation : 0;
            
            return new RiskMetrics
            {
                Mean = mean,
                StandardDeviation = standardDeviation,
                Variance = (decimal)variance,
                SharpeRatio = sharpeRatio,
                MinReturn = returns.Min(),
                MaxReturn = returns.Max()
            };
        }

        // Tax Calculation by Region
        public TaxCalculation CalculateTax(decimal income, string region)
        {
            decimal tax = region.ToUpper() switch
            {
                "ZA" => CalculateSouthAfricaTax(income),
                "NG" => CalculateNigeriaTax(income),
                "GH" => CalculateGhanaTax(income),
                "KE" => CalculateKenyaTax(income),
                _ => income * 0.20m
            };
            
            var effectiveRate = income > 0 ? (tax / income) * 100 : 0;
            
            return new TaxCalculation
            {
                GrossIncome = income,
                TaxAmount = tax,
                NetIncome = income - tax,
                EffectiveRate = effectiveRate,
                Region = region
            };
        }

        private decimal CalculateSouthAfricaTax(decimal income)
        {
            if (income <= 237100) return income * 0.18m;
            if (income <= 370500) return 42678 + (income - 237100) * 0.26m;
            if (income <= 512800) return 77362 + (income - 370500) * 0.31m;
            if (income <= 673000) return 121475 + (income - 512800) * 0.36m;
            if (income <= 857900) return 179147 + (income - 673000) * 0.39m;
            if (income <= 1817000) return 251258 + (income - 857900) * 0.41m;
            return 644489 + (income - 1817000) * 0.45m;
        }

        private decimal CalculateNigeriaTax(decimal income)
        {
            if (income <= 300000) return income * 0.07m;
            if (income <= 600000) return 21000 + (income - 300000) * 0.11m;
            if (income <= 1100000) return 54000 + (income - 600000) * 0.15m;
            if (income <= 1600000) return 129000 + (income - 1100000) * 0.19m;
            if (income <= 3200000) return 224000 + (income - 1600000) * 0.21m;
            return 560000 + (income - 3200000) * 0.24m;
        }

        private decimal CalculateGhanaTax(decimal income)
        {
            var yearlyIncome = income * 12;
            decimal tax;
            
            if (yearlyIncome <= 5880) tax = 0;
            else if (yearlyIncome <= 3828) tax = yearlyIncome * 0.05m;
            else if (yearlyIncome <= 5772) tax = 191.40m + (yearlyIncome - 3828) * 0.10m;
            else if (yearlyIncome <= 38664) tax = 385.80m + (yearlyIncome - 5772) * 0.175m;
            else tax = 6142.90m + (yearlyIncome - 38664) * 0.25m;
            
            return tax / 12;
        }

        private decimal CalculateKenyaTax(decimal income)
        {
            if (income <= 24000) return income * 0.10m;
            if (income <= 32333) return 2400 + (income - 24000) * 0.25m;
            if (income <= 500000) return 4483.25m + (income - 32333) * 0.30m;
            if (income <= 800000) return 144783.35m + (income - 500000) * 0.325m;
            return 242283.35m + (income - 800000) * 0.35m;
        }
    }

    // Result Models
    public class ROIResult
    {
        public decimal TotalReturn { get; set; }
        public decimal SimpleROI { get; set; }
        public decimal CAGR { get; set; }
        public int Years { get; set; }
    }

    public class RiskMetrics
    {
        public decimal Mean { get; set; }
        public decimal StandardDeviation { get; set; }
        public decimal Variance { get; set; }
        public decimal SharpeRatio { get; set; }
        public decimal MinReturn { get; set; }
        public decimal MaxReturn { get; set; }
    }

    public class TaxCalculation
    {
        public decimal GrossIncome { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal NetIncome { get; set; }
        public decimal EffectiveRate { get; set; }
        public string Region { get; set; }
    }
}
