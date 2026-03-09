// /api/mpesa/confirmation.ts
export default function handler(req, res) {
  // Save payment to DB here

  res.json({
    ResultCode: 0,
    ResultDesc: "Success"
  });
}
