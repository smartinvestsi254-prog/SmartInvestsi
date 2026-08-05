import { prisma } from "../lib/prisma";
import { env } from "../config/env";

/**
 * PayPal integration with:
 * - OAuth token management
 * - Order creation & capture
 * - Webhook signature verification (RSA)
 * - Subscription renewals / cancellations
 * - Dispute handling
 * - Failed payment handling
 */

const PAYPAL_BASE_URL =
  env.PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.statusText}`);
  const data = await res.json();
  return data.access_token;
}

export async function createOrder(params: {
  userId: string;
  amount: number;
  currency?: string;
  description?: string;
  idempotencyKey: string;
}) {
  const existing = await prisma.paymentTransaction.findUnique({
    where: { idempotencyKey: params.idempotencyKey },
  });
  if (existing) {
    return { success: false, error: "Duplicate request", existing };
  }

  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: params.currency ?? "USD",
            value: params.amount.toFixed(2),
          },
          description: params.description ?? "SmartInvest Payment",
        },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.message || "Failed to create PayPal order" };
  }

  const tx = await prisma.paymentTransaction.create({
    data: {
      userId: params.userId,
      amount: params.amount,
      currency: params.currency ?? "USD",
      status: "PENDING",
      provider: "PAYPAL",
      providerRef: data.id,
      type: "SUBSCRIPTION",
      idempotencyKey: params.idempotencyKey,
      metadata: { status: data.status },
    },
  });

  const approvalUrl = data.links?.find((l: any) => l.rel === "approve")?.href;
  return { success: true, orderId: data.id, approvalUrl, transactionId: tx.id };
}

export async function captureOrder(orderId: string, userId: string) {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: "{}",
  });
  const data = await res.json();

  const tx = await prisma.paymentTransaction.findUnique({ where: { providerRef: orderId } });
  if (!tx) return { success: false, error: "Transaction not found" };

  if (res.ok && data.status === "COMPLETED") {
    // Replay prevention
    if (tx.status === "COMPLETED") {
      return { success: false, error: "Replay attempt blocked" };
    }
    await prisma.paymentTransaction.update({
      where: { id: tx.id },
      data: {
        status: "COMPLETED",
        metadata: { ...(tx.metadata as any), captureId: data.purchase_units?.[0]?.payments?.captures?.[0]?.id },
      },
    });
    await activateSubscription(userId, tx.amount);
    return { success: true, transactionId: tx.id };
  }

  await prisma.paymentTransaction.update({
    where: { id: tx.id },
    data: { status: "FAILED", metadata: { ...(tx.metadata as any), reason: data.message } },
  });
  return { success: false, error: data.message || "Capture failed" };
}

/**
 * Verify PayPal webhook signature using the verify-webhook-signature API.
 */
export async function verifyPayPalWebhook(headers: any, rawBody: string): Promise<boolean> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: headers["paypal-auth-algo"],
        cert_url: headers["paypal-cert-url"],
        transmission_id: headers["paypal-transmission-id"],
        transmission_sig: headers["paypal-transmission-sig"],
        transmission_time: headers["paypal-transmission-time"],
        webhook_id: env.PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(rawBody),
      }),
    });
    const data = await res.json();
    return data.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}

/**
 * Handle PayPal webhook events: renewals, cancellations, disputes, failed payments.
 */
export async function handlePaypalWebhook(event: any) {
  const { event_type, resource } = event;
  const email = resource?.payer_email || resource?.email || resource?.subscriber?.email_address;

  switch (event_type) {
    case "PAYMENT.SALE.COMPLETED":
      // Billing subscription payment captured -> renewal
      if (email) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          await prisma.paymentTransaction.create({
            data: {
              userId: user.id,
              amount: Number(resource.amount?.total || 0),
              currency: resource.amount?.currency || "USD",
              status: "COMPLETED",
              provider: "PAYPAL",
              providerRef: resource.id,
              type: "SUBSCRIPTION",
              idempotencyKey: `paypal-${resource.id}`,
              metadata: { event: event_type },
            },
          });
          await activateSubscription(user.id, Number(resource.amount?.total || 0));
        }
      }
      return { success: true, handled: "renewal" };

    case "BILLING.SUBSCRIPTION.CANCELLED":
      if (email) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          await prisma.subscription.updateMany({
            where: { userId: user.id, status: "ACTIVE" },
            data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "PayPal subscription cancelled" },
          });
        }
      }
      return { success: true, handled: "cancellation" };

    case "BILLING.SUBSCRIPTION.SUSPENDED":
      if (email) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          await prisma.subscription.updateMany({
            where: { userId: user.id, status: "ACTIVE" },
            data: { status: "PAST_DUE" },
          });
        }
      }
      return { success: true, handled: "suspended" };

    case "PAYMENT.SALE.DENIED":
    case "PAYMENT.SALE.FAILED":
      if (email) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          await prisma.subscription.updateMany({
            where: { userId: user.id, status: "PAST_DUE" },
            data: { status: "PAST_DUE" },
          });
        }
      }
      return { success: true, handled: "failed-payment" };

    case "CUSTOMER.DISPUTE.CREATED":
    case "CUSTOMER.DISPUTE.RESOLVED":
      if (email) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          await prisma.fraudCheck.create({
            data: {
              userId: user.id,
              checkType: "PAYPAL_DISPUTE",
              status: "FLAGGED",
              details: { disputeId: resource.dispute_id, event: event_type },
            },
          });
        }
      }
      return { success: true, handled: "dispute" };

    default:
      return { success: true, handled: "ignored", event_type };
  }
}

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
      paymentMethod: "PAYPAL",
    },
  });
}

export { PAYPAL_BASE_URL };
