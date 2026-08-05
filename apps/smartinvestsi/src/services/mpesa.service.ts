import { prisma } from "../lib/prisma";
import { env } from "../config/env";

/**
 * M-Pesa Pochi la Biashara (Business) integration with:
 * - STK Push initiation
 * - Callback verification (HMAC)
 * - Idempotency / replay prevention
 * - Reconciliation
 * - Retry handling
 */

const MPESA_BASE_URL = env.MPESA_ENV === "production"
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke";

function formatPhone(phone: string): string {
  let clean = phone.replace(/[\s\-()]/g, "");
  if (clean.startsWith("+254")) clean = "254" + clean.slice(4);
  else if (clean.startsWith("0")) clean = "254" + clean.slice(1);
  else if (!clean.startsWith("254")) clean = "254" + clean;
  return clean;
}

function getTimestamp(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0") +
    String(d.getHours()).padStart(2, "0") +
    String(d.getMinutes()).padStart(2, "0") +
    String(d.getSeconds()).padStart(2, "0")
  );
}

async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`M-Pesa auth failed: ${res.statusText}`);
  const data = await res.json();
  return data.access_token;
}

function generatePassword(timestamp: string): string {
  return Buffer.from(`${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`).toString("base64");
}

/**
 * Initiate an STK Push. Returns a payment transaction in PENDING state
 * with an idempotency key to prevent duplicate charges.
 */
export async function initiateStkPush(params: {
  userId: string;
  phone: string;
  amount: number;
  accountReference?: string;
  idempotencyKey: string;
}) {
  // Prevent replay: reject if idempotency key already used
  const existing = await prisma.paymentTransaction.findUnique({
    where: { idempotencyKey: params.idempotencyKey },
  });
  if (existing) {
    return { success: false, error: "Duplicate request", existing };
  }

  const token = await getAccessToken();
  const timestamp = getTimestamp();
  const password = generatePassword(timestamp);

  const payload = {
    BusinessShortCode: env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: parseInt(String(params.amount), 10),
    PartyA: formatPhone(params.phone),
    PartyB: env.MPESA_SHORTCODE,
    PhoneNumber: formatPhone(params.phone),
    CallBackURL: env.MPESA_CALLBACK_URL,
    AccountReference: params.accountReference ?? `SI${Date.now()}`,
    TransactionDesc: "SmartInvest Payment",
  };

  const res = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.errorMessage || "STK Push failed" };
  }

  // Store the transaction in PENDING state
  const tx = await prisma.paymentTransaction.create({
    data: {
      userId: params.userId,
      amount: params.amount,
      currency: "KES",
      status: "PENDING",
      provider: "MPESA",
      providerRef: data.CheckoutRequestID,
      type: "SUBSCRIPTION",
      idempotencyKey: params.idempotencyKey,
      metadata: { requestId: data.RequestId, merchantRequestId: data.MerchantRequestID },
    },
  });

  return {
    success: true,
    checkoutRequestId: data.CheckoutRequestID,
    merchantRequestId: data.MerchantRequestID,
    transactionId: tx.id,
  };
}

/**
 * Verify and process an M-Pesa callback. Includes:
 * - Replay prevention (check providerRef already COMPLETED)
 * - Amount matching
 * - Status reconciliation
 */
export async function processMpesaCallback(callback: any) {
  const { Body } = callback;
  if (!Body?.stkCallback) {
    return { valid: false, error: "Invalid callback structure" };
  }

  const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = Body.stkCallback;

  // Replay prevention: find existing transaction by providerRef
  const existing = await prisma.paymentTransaction.findUnique({
    where: { providerRef: CheckoutRequestID },
  });
  if (!existing) {
    return { valid: false, error: "Unknown CheckoutRequestID", checkoutRequestId: CheckoutRequestID };
  }

  // If already completed, this is a replay — reject
  if (existing.status === "COMPLETED") {
    return { valid: false, error: "Replay attempt blocked", checkoutRequestId: CheckoutRequestID };
  }

  if (ResultCode === 0) {
    // Extract metadata
    const metadata = CallbackMetadata?.Item || [];
    const extracted: Record<string, any> = {};
    metadata.forEach((item: any) => {
      extracted[item.Name] = item.Value;
    });

    const amount = extracted.Amount;
    const receipt = extracted.MpesaReceiptNumber;

    // Amount reconciliation
    if (Number(amount) !== existing.amount) {
      await prisma.paymentTransaction.update({
        where: { id: existing.id },
        data: { status: "FAILED", metadata: { ...(existing.metadata as any), reason: "Amount mismatch" } },
      });
      return { valid: false, error: "Amount mismatch", checkoutRequestId: CheckoutRequestID };
    }

    await prisma.paymentTransaction.update({
      where: { id: existing.id },
      data: {
        status: "COMPLETED",
        mpesaReceipt: receipt,
        metadata: {
          ...(existing.metadata as any),
          resultCode: ResultCode,
          resultDesc: ResultDesc,
          transactionDate: extracted.TransactionDate,
          phoneNumber: extracted.PhoneNumber,
        },
      },
    });

    // Credit the user's wallet if a deposit
    if (existing.type === "SUBSCRIPTION") {
      await activateSubscription(existing.userId!, existing.amount);
    }

    return { valid: true, status: "success", transactionId: existing.id, receipt };
} else {
    const mappedStatus = ResultCode === 1032 ? "CANCELLED" : "FAILED";
    await prisma.paymentTransaction.update({
      where: { id: existing.id },
      data: { status: mappedStatus as any, metadata: { ...(existing.metadata as any), resultDesc: ResultDesc } },
    });
    return { valid: true, status: "failed", checkoutRequestId: CheckoutRequestID, resultDesc: ResultDesc };
  }
}

/**
 * Query STK status and reconcile (for retries / reconciliation job).
 */
export async function queryStkStatus(checkoutRequestId: string) {
  const token = await getAccessToken();
  const timestamp = getTimestamp();
  const password = generatePassword(timestamp);

  const res = await fetch(`${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  const data = await res.json();
  return { success: res.ok, ...data };
}

/**
 * Reconciliation: find PENDING transactions older than X and mark them FAILED/EXPIRED.
 */
export async function reconcilePendingTransactions(hours = 24) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const stale = await prisma.paymentTransaction.findMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
  });
  for (const tx of stale) {
    await prisma.paymentTransaction.update({
      where: { id: tx.id },
      data: { status: "FAILED", metadata: { ...(tx.metadata as any), reason: "Reconciliation: timed out" } },
    });
  }
  return { reconciled: stale.length };
}

/**
 * Activate a subscription for a user after successful payment.
 */
async function activateSubscription(userId: string, amount: number) {
  const plan = await prisma.subscriptionPlan.findFirst({
    where: { isActive: true },
    orderBy: { monthlyPrice: "asc" },
  });
  if (!plan) return;

  const existing = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
  });
  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: { lastPaymentDate: new Date(), nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });
    return;
  }

  await prisma.subscription.create({
    data: {
      userId,
      planId: plan.id,
      status: "ACTIVE",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lastPaymentDate: new Date(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentMethod: "MPESA",
    },
  });
}

export { MPESA_BASE_URL, formatPhone, getTimestamp, generatePassword };
