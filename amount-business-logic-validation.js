const expectedAmount = getOrderAmount(req.body.BillRefNumber);

if (Number(req.body.TransAmount) !== expectedAmount) {
  return res.json({
    ResultCode: 1,
    ResultDesc: "Amount mismatch"
  });
}
