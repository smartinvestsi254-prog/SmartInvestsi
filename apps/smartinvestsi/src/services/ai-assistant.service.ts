import { prisma } from "../lib/prisma";

/**
 * AI Investment Assistant.
 * NOTE: This is a rule-based recommendation engine. In production,
 * plug in an LLM (OpenAI/Anthropic) or a quantitative model.
 */

export interface RiskProfile {
  riskTolerance: "conservative" | "moderate" | "aggressive";
  timeHorizon: string;
  investmentGoal: string;
}

export interface Recommendation {
  assetClass: string;
  allocation: number;
  rationale: string;
  suggestedSymbols: string[];
}

export async function getRiskProfile(userId: string): Promise<RiskProfile | null> {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) return null;
  return {
    riskTolerance: (profile.riskTolerance as RiskProfile["riskTolerance"]) ?? "moderate",
    timeHorizon: profile.timeHorizon ?? "long-term",
    investmentGoal: profile.investmentGoal ?? "growth",
  };
}

export async function getRecommendations(userId: string): Promise<Recommendation[]> {
  const profile = await getRiskProfile(userId);
  const risk = profile?.riskTolerance ?? "moderate";

  const allocations: Record<string, Recommendation[]> = {
    conservative: [
      { assetClass: "Bonds", allocation: 40, rationale: "Low volatility, stable income", suggestedSymbols: ["TNOTE", "BND"] },
      { assetClass: "Stocks", allocation: 30, rationale: "Long-term growth", suggestedSymbols: ["VOO", "MSFT"] },
      { assetClass: "Cash", allocation: 20, rationale: "Liquidity and safety", suggestedSymbols: ["USD"] },
      { assetClass: "Gold", allocation: 10, rationale: "Inflation hedge", suggestedSymbols: ["GLD"] },
    ],
    moderate: [
      { assetClass: "Stocks", allocation: 40, rationale: "Growth potential", suggestedSymbols: ["VOO", "AAPL", "MSFT"] },
      { assetClass: "Bonds", allocation: 25, rationale: "Stability", suggestedSymbols: ["BND", "TNOTE"] },
      { assetClass: "Crypto", allocation: 15, rationale: "High growth potential", suggestedSymbols: ["BTC", "ETH"] },
      { assetClass: "Cash", allocation: 10, rationale: "Liquidity", suggestedSymbols: ["USD"] },
      { assetClass: "Gold", allocation: 10, rationale: "Hedge", suggestedSymbols: ["GLD"] },
    ],
    aggressive: [
      { assetClass: "Stocks", allocation: 45, rationale: "Aggressive growth", suggestedSymbols: ["NVDA", "TSLA", "AMZN"] },
      { assetClass: "Crypto", allocation: 30, rationale: "High risk/reward", suggestedSymbols: ["BTC", "ETH", "SOL"] },
      { assetClass: "Growth ETFs", allocation: 15, rationale: "Diversified growth", suggestedSymbols: ["QQQ", "ARKK"] },
      { assetClass: "Cash", allocation: 10, rationale: "Opportunity reserve", suggestedSymbols: ["USD"] },
    ],
  };

  return allocations[risk] ?? allocations.moderate;
}

export async function getPortfolioInsights(userId: string) {
  const portfolios = await prisma.portfolio.findMany({
    where: { userId },
    include: { holdings: true },
  });

  const totalValue = portfolios.reduce((s, p) => s + p.totalValue, 0);
  const totalHoldings = portfolios.reduce((s, p) => s + p.holdings.length, 0);

  const insights = [
    {
      type: "DIVERSIFICATION",
      message:
        totalHoldings < 5
          ? "Consider diversifying across more assets to reduce risk."
          : "Your portfolio is well diversified.",
    },
    {
      type: "LIQUIDITY",
      message:
        totalValue > 0
          ? "Maintain adequate cash reserves for market opportunities."
          : "Start building your portfolio to begin investing.",
    },
  ];

  return { totalValue, totalHoldings, insights };
}

export async function getInvestmentPlan(userId: string) {
  const profile = await getRiskProfile(userId);
  const recommendations = await getRecommendations(userId);
  return {
    profile,
    recommendations,
    disclaimer:
      "This is an AI-generated suggestion for informational purposes only and is not financial advice.",
  };
}
