// /api/mpesa/stkPush.ts
import axios from "axios";
import { getToken } from "./auth";

export default async function handler(req, res) {
  const token = await getToken();

  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);

  const password = Buffer.from(
    `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
  ).toString("base64");

  const response = await axios.post(
    "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
    {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: req.body.amount,
      PartyA: req.body.phone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: req.body.phone,
      CallBackURL: "https://yourdomain.vercel.app/api/mpesa/callback",
      AccountReference: "Order123",
      TransactionDesc: "Payment"
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  res.json(response.data);
}
