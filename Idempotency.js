const exists = await db.transaction.findUnique({
  where: { transId: req.body.TransID }
});

if (exists) {
  return res.json({ ResultCode: 0 });
}
