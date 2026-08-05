// Minimal financial calculators and recommendation scaffolding
function pensionProjection({ currentSavings=0, monthlyContribution=0, years=20, annualReturn=0.05 }) {
  const months = years * 12;
  let balance = currentSavings;
  const r = Math.pow(1 + annualReturn, 1/12) - 1;
  for (let i=0;i<months;i++) {
    balance = balance * (1 + r) + monthlyContribution;
  }
  return { projectedBalance: balance };
}

function recommendPensionAction({ age, currentSavings=0, desiredRetirement=1000000 }) {
  // Very simple rule-based recommendations
  if (!age) return { recommendation: 'Provide age for tailored advice' };
  if (currentSavings >= desiredRetirement) return { recommendation: 'On track' };
  if (age < 40) return { recommendation: 'Increase contributions and invest in growth assets' };
  return { recommendation: 'Consider conservative allocation and increase savings rate' };
}

module.exports = { pensionProjection, recommendPensionAction };
