// /api/mpesa/callback.ts
export default function handler(req, res) {
  const result = req.body.Body.stkCallback;

  if (result.ResultCode === 0) {
    // Payment success
  } else {
    // Payment failed
  }

  res.json({ ResultCode: 0, ResultDesc: "OK" });
}
