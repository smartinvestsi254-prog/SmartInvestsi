// /lib/verifyMpesaIP.ts
const SAFARICOM_IPS = [
  "196.201.214.200",
  "196.201.214.206",
  "196.201.213.114",
  "196.201.214.207",
  "196.201.214.208"
];

export function verifyMpesaIP(req) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket?.remoteAddress;

  return SAFARICOM_IPS.includes(ip);
}

if (!verifyMpesaIP(req)) {
  return res.status(403).json({ message: "Forbidden" });
}

if (req.method !== "POST") {
  return res.status(405).end();
}

if (!req.headers["content-type"]?.includes("application/json")) {
  return res.status(400).end();
}

