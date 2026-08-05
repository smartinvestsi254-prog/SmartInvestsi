# Webhooks & Simulation

This document explains how the app maps incoming payment webhooks to file purchases and includes small scripts to simulate webhooks locally.

Mapping rules (strict)

- PayPal: include the target file id exactly in `purchase_units[].custom_id`, `purchase_units[].reference_id`, or `purchase_units[].invoice_id`. The webhook parser will look only at those fields for exact matches.
- M-Pesa (Daraja STK Push): include the target file id in the `AccountReference` value in the `CallbackMetadata.Item` list (Name = `AccountReference` or `Account`). The callback handler will only match exact values.
- KCB / Bank transfers: include the target file id exactly as the `reference` field used in manual transfers. When an admin marks the transfer paid, the `reference` must equal the file id to trigger auto-granting.

Basic flows

- Admin uploads a file and gets its `id` (from `data/files.json` or the admin UI).
- When creating a payment (PayPal / M-Pesa / bank), set the corresponding field to that `id` so the webhook can grant access automatically on successful payment.

Simulating webhooks locally

Demo simulation scripts were removed from the repository to avoid encouraging insecure local testing. Use your payment provider's sandbox/test tooling or a dedicated test harness that implements proper request signing when testing webhooks.

Notes on testing safely

- Run the server locally and configure webhook endpoints in the provider sandbox (PayPal / M-Pesa) to point to your machine (use a tunnel like `ngrok`).
- For M-Pesa callbacks the app can be configured to require an HMAC signature by setting `MPESA_CALLBACK_SECRET`; when set the server will expect an `x-mpesa-signature` header containing the HMAC-SHA256 of the JSON payload (hex-encoded).
- Do not recreate insecure demo endpoints in production. If you need test automation, write tests that simulate provider-signed payloads and keep secrets out of source control.

If you want, I can add guidance or example scripts that demonstrate how to generate signed test payloads for each provider (safe for local testing).

Purchase flow & quick acceptance tests

- Flow summary:

 1. Admin uploads a file and notes its `id`.
 2. When creating a payment, include that `id` so webhooks can map the payment to the file:

- PayPal: set `purchase_units[].custom_id` or `purchase_units[].reference_id` (or `invoice_id`).
- M-Pesa: set `AccountReference` in the `CallbackMetadata.Item` list.
- KCB manual transfers: include the file `id` as the `reference` when recording the transfer.

 1. Provider calls the configured webhook endpoint on success; the server maps the incoming payload to the file id and calls `grantPurchase(...)` to record the purchase.
 2. Purchases are stored in `data/purchases.json`; users can then request a short-lived download token via `/api/download/request` (include the purchaser email).

- Quick acceptance tests (run against a local server on `http://localhost:3000`)

 1) Prepare: ensure a published file exists and note its id (replace `FILE_ID` below). Create or use a buyer email (e.g. `buyer@example.com`).

 2) Simulate a PayPal webhook that contains the file id:

```bash
curl -s -X POST -H "Content-Type: application/json" \
 -d '{"resource":{"purchase_units":[{"custom_id":"FILE_ID"}],"payer":{"email_address":"buyer@example.com"}}}' \
 http://localhost:3000/api/pay/paypal/webhook
```

 1) Simulate an M-Pesa STK push callback (AccountReference in CallbackMetadata):

```bash
curl -s -X POST -H "Content-Type: application/json" \
 -d '{"Body":{"stkCallback":{"CallbackMetadata":{"Item":[{"Name":"AccountReference","Value":"FILE_ID"},{"Name":"PhoneNumber","Value":"254712345678"}]}}}}' \
 http://localhost:3000/api/pay/mpesa/callback
```

 1) After the webhook is processed the purchase should be recorded. You can request a download token (server will expect buyer email):

```bash
curl -s -X POST -H "Content-Type: application/json" -H "x-user-email: buyer@example.com" \
 -d '{"fileId":"FILE_ID","email":"buyer@example.com"}' \
 http://localhost:3000/api/download/request
```

 Expected result: the `/api/download/request` response returns `success: true` and a `url` for a short-lived download link.

Notes:

- If you use M-Pesa testing with `MPESA_CALLBACK_SECRET` set, include the `x-mpesa-signature` header containing the HMAC-SHA256 hex digest of the JSON body.
- Admin routes (upload, mark-paid, grant) are protected by basic auth if `ADMIN_USER` is configured; use those for preparing test files or marking bank transfers paid.
- For fully-automated acceptance tests prefer a test harness that can create a file via the admin API, create a payment intent including the file id, and simulate provider-signed webhooks rather than relying on manual steps.
