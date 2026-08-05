'use strict';

(function () {
  const PROFILE_KEY = 'si_profile_mvp';
  const form = document.getElementById('onboardingForm');
  const statusEl = document.getElementById('onboardingStatus');
  const summaryEl = document.getElementById('onboardingSummary');
  const pillEl = document.getElementById('onboardingPill');
  const actionsEl = document.getElementById('onboardingActions');
  const resetBtn = document.getElementById('onboardingReset');

  if (!form || !statusEl || !summaryEl || !pillEl || !actionsEl || !resetBtn) {
    return;
  }

  function safeParse(value) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return null;
    }
  }

  function loadProfile() {
    const stored = localStorage.getItem(PROFILE_KEY);
    return stored ? safeParse(stored) : null;
  }

  async function fetchProfileFromApi() {
    try {
      const email = localStorage.getItem('si_user_email');
      const url = email ? `/api/profile?email=${encodeURIComponent(email)}` : '/api/profile';
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) return null;
      const data = await response.json();
      return data?.profile || null;
    } catch (e) {
      return null;
    }
  }

  async function saveProfileToApi(profile) {
    try {
      const email = localStorage.getItem('si_user_email');
      const payload = email ? { ...profile, email } : profile;
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {}
  }

  async function trackEvent(event, data) {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, data, timestamp: new Date().toISOString() })
      });
    } catch (e) {}
  }

  function saveProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  function formatCurrency(value) {
    if (Number.isNaN(value)) return '0';
    return new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 }).format(value);
  }

  function getAllocation(risk) {
    if (risk === 'low') {
      return { stocks: 30, bonds: 50, cash: 20 };
    }
    if (risk === 'high') {
      return { stocks: 65, bonds: 20, cash: 15 };
    }
    return { stocks: 50, bonds: 30, cash: 20 };
  }

  function getGoalLabel(goal) {
    const labels = {
      growth: 'Wealth Growth',
      retirement: 'Retirement',
      education: 'Education Fund',
      business: 'Business Expansion',
      income: 'Monthly Income'
    };
    return labels[goal] || 'Wealth Growth';
  }

  function buildSummary(profile) {
    const allocation = getAllocation(profile.risk);
    const impactText = profile.impact ? 'Impact-focused portfolio with sustainability filters.' : 'Standard market portfolio focus.';
    return `${getGoalLabel(profile.goal)} plan, ${profile.horizon} horizon, ${profile.risk} risk. ` +
      `Target monthly contribution: KES ${formatCurrency(profile.contribution)}. ` +
      `Suggested mix: ${allocation.stocks}% stocks, ${allocation.bonds}% bonds, ${allocation.cash}% cash. ${impactText}`;
  }

  function buildActions(profile) {
    const actions = [];

    actions.push({
      title: 'Set your monthly auto-invest',
      detail: `Start with KES ${formatCurrency(profile.contribution)} and adjust as income grows.`,
      cta: 'Configure contributions'
    });

    if (profile.risk === 'low') {
      actions.push({
        title: 'Stability-first playbook',
        detail: 'Favor income funds and capital-preservation assets for steady growth.',
        cta: 'Open stability guide'
      });
    } else if (profile.risk === 'high') {
      actions.push({
        title: 'Growth-first playbook',
        detail: 'Add thematic equities and higher-return vehicles with strong risk limits.',
        cta: 'Open growth guide'
      });
    } else {
      actions.push({
        title: 'Balanced core strategy',
        detail: 'Blend equities and bonds with quarterly rebalancing.',
        cta: 'Open balanced guide'
      });
    }

    actions.push({
      title: 'Enable smart alerts',
      detail: 'Get notified on payment status, portfolio drift, and market shifts.',
      cta: 'Enable alerts'
    });

    if (profile.impact) {
      actions.push({
        title: 'Impact transparency pack',
        detail: 'Track sustainability metrics and public-benefit disclosures.',
        cta: 'View impact dashboard'
      });
    }

    return actions;
  }

  function renderProfile(profile) {
    if (!profile) {
      statusEl.textContent = 'Not started';
      summaryEl.textContent = 'Complete the plan to see personalized next steps.';
      pillEl.textContent = 'Not personalized';
      actionsEl.innerHTML = '<div class="col-md-6"><div class="card h-100"><div class="card-body"><h6 class="fw-bold">Complete your plan</h6><p class="text-muted mb-2">Tell us your goals to unlock next best actions.</p><button class="btn btn-outline-primary btn-sm" type="button">Start now</button></div></div></div>';
      return;
    }

    statusEl.textContent = 'Personalized';
    summaryEl.textContent = buildSummary(profile);
    pillEl.textContent = `${getGoalLabel(profile.goal)} • ${profile.risk} risk`;

    const cards = buildActions(profile).map(action => {
      return `
        <div class="col-md-6">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="fw-bold">${action.title}</h6>
              <p class="text-muted mb-2">${action.detail}</p>
              <button class="btn btn-outline-primary btn-sm" type="button">${action.cta}</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    actionsEl.innerHTML = cards;
  }

  function populateForm(profile) {
    if (!profile) return;
    form.goal.value = profile.goal;
    form.horizon.value = profile.horizon;
    form.risk.value = profile.risk;
    form.region.value = profile.region;
    form.contribution.value = profile.contribution;
    form.impact.checked = Boolean(profile.impact);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const payload = {
      goal: form.goal.value,
      horizon: form.horizon.value,
      risk: form.risk.value,
      region: form.region.value,
      contribution: Number(form.contribution.value || 0),
      impact: form.impact.checked
    };

    saveProfile(payload);
    saveProfileToApi(payload);
    renderProfile(payload);
    trackEvent('onboarding_saved', { risk: payload.risk, goal: payload.goal, region: payload.region });
  });

  resetBtn.addEventListener('click', () => {
    localStorage.removeItem(PROFILE_KEY);
    form.reset();
    renderProfile(null);
  });

  (async () => {
    let profile = loadProfile();
    if (!profile) {
      profile = await fetchProfileFromApi();
      if (profile) saveProfile(profile);
    }

    if (profile) {
      populateForm(profile);
    }

    renderProfile(profile);
    trackEvent('onboarding_view', { hasProfile: Boolean(profile) });
  })();
})();
