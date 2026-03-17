const rateMap = new Map();

export function rateLimit(ip) {
  const now = Date.now();
  const data = rateMap.get(ip) || [];
  const recent = data.filter(t => now - t < 60000);

  if (recent.length > 30) return false;

  rateMap.set(ip, [...recent, now]);
  return true;
}
