(function () {
  const form = document.getElementById('cityForm');
  const input = document.getElementById('cityInput');
  const statusEl = document.getElementById('searchStatus');
  const currentEl = document.getElementById('currentWeather');
  const hourlyEl = document.getElementById('hourlyTemps');
  const dailyEl = document.getElementById('dailyForecast');

  if (!form || !input || !statusEl || !currentEl || !hourlyEl || !dailyEl) {
    return;
  }

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function formatTemp(value, unit) {
    if (typeof value !== 'number' || Number.isNaN(value)) return '--';
    return `${value.toFixed(1)}${unit}`;
  }

  function toLocalTime(iso) {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString();
    } catch (_e) {
      return iso;
    }
  }

  async function geocodeCity(query) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();
    if (!data || !data.results || !data.results.length) {
      throw new Error('City not found');
    }
    return data.results[0];
  }

  async function fetchForecast(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather fetch failed');
    return res.json();
  }

  function renderCurrent(city, data) {
    const current = data.current || {};
    const temp = formatTemp(current.temperature_2m, data.current_units?.temperature_2m || 'C');
    const wind = formatTemp(current.wind_speed_10m, data.current_units?.wind_speed_10m || 'km/h');
    const at = toLocalTime(current.time || '');

    currentEl.innerHTML = `
      <div class="text-slate-700">
        <div class="text-lg font-semibold">${city.name}, ${city.country}</div>
        <div class="text-sm">Updated: ${at}</div>
        <div class="mt-3 text-2xl font-bold">${temp}</div>
        <div class="text-sm text-slate-500">Wind: ${wind}</div>
      </div>
    `;
  }

  function renderHourly(data) {
    const times = data.hourly?.time || [];
    const temps = data.hourly?.temperature_2m || [];
    const unit = data.hourly_units?.temperature_2m || 'C';
    const maxItems = Math.min(times.length, 24, temps.length);

    hourlyEl.innerHTML = '';
    for (let i = 0; i < maxItems; i += 1) {
      const card = document.createElement('div');
      card.className = 'border rounded-lg p-3 bg-slate-50';
      card.innerHTML = `
        <div class="text-xs text-slate-500">${toLocalTime(times[i])}</div>
        <div class="text-lg font-semibold">${formatTemp(temps[i], unit)}</div>
      `;
      hourlyEl.appendChild(card);
    }
  }

  function renderDaily(data) {
    const times = data.daily?.time || [];
    const maxTemps = data.daily?.temperature_2m_max || [];
    const minTemps = data.daily?.temperature_2m_min || [];
    const unit = data.daily_units?.temperature_2m_max || 'C';
    const count = Math.min(times.length, maxTemps.length, minTemps.length);

    dailyEl.innerHTML = '';
    for (let i = 0; i < count; i += 1) {
      const card = document.createElement('div');
      card.className = 'border rounded-lg p-3 bg-white';
      card.innerHTML = `
        <div class="text-xs text-slate-500">${times[i]}</div>
        <div class="text-lg font-semibold">${formatTemp(maxTemps[i], unit)}</div>
        <div class="text-sm text-slate-500">Low: ${formatTemp(minTemps[i], unit)}</div>
      `;
      dailyEl.appendChild(card);
    }
  }

  async function handleSearch(event) {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    setStatus('Searching for city...');
    currentEl.textContent = 'Loading...';
    hourlyEl.innerHTML = '';
    dailyEl.innerHTML = '';

    try {
      const city = await geocodeCity(query);
      setStatus(`Found ${city.name}, ${city.country}. Loading forecast...`);
      const data = await fetchForecast(city.latitude, city.longitude);
      renderCurrent(city, data);
      renderHourly(data);
      renderDaily(data);
      setStatus('Weather data loaded.');
    } catch (err) {
      currentEl.textContent = 'Unable to load weather data.';
      setStatus(err && err.message ? err.message : 'Failed to load weather data.');
    }
  }

  form.addEventListener('submit', handleSearch);
})();
