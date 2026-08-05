#!/usr/bin/env node
// Acceptance test: create a file via admin API, simulate PayPal webhook,
// request a download token and verify the download works.

const fs = require('fs');
const os = require('os');
const path = require('path');
const fetch = globalThis.fetch || require('node-fetch');

const SERVER = process.env.SERVER_URL || 'http://localhost:3000';
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const BUYER_EMAIL = process.env.BUYER_EMAIL || 'buyer@example.com';

function authHeader() {
  if (!ADMIN_USER) return {};
  const cred = Buffer.from(`${ADMIN_USER}:${ADMIN_PASS||''}`).toString('base64');
  return { Authorization: `Basic ${cred}` };
}

async function uploadTestFile() {
  const tmp = path.join(os.tmpdir(), 'si-acceptance-' + Date.now() + '.txt');
  fs.writeFileSync(tmp, 'Acceptance test file content');

  const form = new (globalThis.FormData || require('form-data'))();
  form.append('file', fs.createReadStream(tmp));
  form.append('title', 'Acceptance Test File');
  form.append('description', 'Created by acceptance_test.js');
  form.append('price', '1');
  form.append('published', 'true');

  const headers = Object.assign({}, authHeader());
  // If using node-fetch and form-data, let form provide headers
  if (form.getHeaders) Object.assign(headers, form.getHeaders());

  const res = await fetch(`${SERVER}/api/admin/files/upload`, { method: 'POST', body: form, headers });
  const data = await res.json().catch(()=>({ ok:false }));
  if (!res.ok || !data || !data.file) throw new Error('upload failed: ' + JSON.stringify(data));
  fs.unlinkSync(tmp);
  return data.file;
}

async function simulatePaypalWebhook(fileId) {
  const body = { resource: { purchase_units: [{ custom_id: fileId }], payer: { email_address: BUYER_EMAIL } } };
  const res = await fetch(`${SERVER}/api/pay/paypal/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('paypal webhook failed: ' + res.status);
  return await res.json().catch(()=>({}));
}

async function requestDownloadToken(fileId) {
  const body = { fileId, email: BUYER_EMAIL };
  const headers = { 'Content-Type': 'application/json', 'x-user-email': BUYER_EMAIL };
  const res = await fetch(`${SERVER}/api/download/request`, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json().catch(()=>null);
  if (!res.ok || !data || !data.success || !data.url) throw new Error('download request failed: ' + JSON.stringify(data));
  return data.url;
}

async function fetchUrlAsText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('download fetch failed: ' + res.status);
  return await res.text();
}

(async function main(){
  console.log('Acceptance test starting against', SERVER);
  try {
    const file = await uploadTestFile();
    console.log('Uploaded file id:', file.id);

    await simulatePaypalWebhook(file.id);
    console.log('Simulated PayPal webhook for', file.id);

    // give the server a moment to process
    await new Promise(r => setTimeout(r, 500));

    const url = await requestDownloadToken(file.id);
    console.log('Download token URL:', url);

    // Try to download the file
    const content = await fetchUrlAsText(url);
    if (!content.includes('Acceptance test file content')) throw new Error('downloaded content mismatch');

    console.log('Download verified — acceptance test passed');
    process.exit(0);
  } catch (e) {
    console.error('Acceptance test failed:', e && e.message || e);
    process.exit(1);
  }
})();
