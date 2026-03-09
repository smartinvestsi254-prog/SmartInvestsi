export default async function handler(req, res) {
  const start = Date.now();

  let status = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    checks: {},
    healthy: true
  };

  try {
    // Example: DB check
    // await db.query("SELECT 1");
    status.checks.database = "ok";
  } catch (e) {
    status.checks.database = "fail";
    status.healthy = false;
  }

  try {
    // External API check
    const response = await fetch("https://api.github.com");
    status.checks.externalAPI = response.ok ? "ok" : "fail";
  } catch (e) {
    status.checks.externalAPI = "fail";
    status.healthy = false;
  }

  const responseTime = Date.now() - start;

  status.responseTime = responseTime;

  if (responseTime > 2000) {
    status.healthy = false;
    status.slow = true;
  }

  res.status(status.healthy ? 200 : 500).json(status);
}