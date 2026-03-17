// reporter.js
const { sendMail } = require("../../src/utils/email");
const { warn, info } = require("../../src/utils/logger");
const config = require("./config");

// reporter remains thin; add a small wrapper to build message

async function sendAlert(anomalies) {
  const message = JSON.stringify(anomalies, null, 2);
  const mailOptions = {
    from: config.EMAIL.user,
    to: config.EMAIL.to,
    subject: "🚨 Website Anomaly Alert",
    text: message,
  };

  const result = await sendMail(mailOptions, 3);
  if (!result.success) {
    warn("Alert email failed to send", result.error);
    return false;
  }
  info("📧 Alert sent successfully");
  return true;
}

module.exports = { sendAlert };