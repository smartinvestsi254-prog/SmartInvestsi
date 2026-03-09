if (req.body.BusinessShortCode !== process.env.MPESA_SHORTCODE) {
  return res.json({
    ResultCode: 1,
    ResultDesc: "Invalid Shortcode"
  });
}
