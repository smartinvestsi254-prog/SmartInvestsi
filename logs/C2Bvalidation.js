// /api/mpesa/validation.ts
export default function handler(req, res) {
  const { TransAmount } = req.body;

  if (TransAmount <= 0) {
    return res.json({
      ResultCode: 1,
      ResultDesc: "Rejected"
    });
  }

  return res.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
}
