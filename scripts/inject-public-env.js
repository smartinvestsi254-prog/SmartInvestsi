#!/usr/bin/env node
/**
 * Netlify build-time script: injects public environment variables into the
 * static HTML pages so the frontend (public/js/public-config.js) can read them
 * at runtime via window.__NETLIFY_ENV__.
 *
 * Usage: node scripts/inject-public-env.js
 *
 * Reads these env vars (optional; falls back to defaults in public-config.js):
 *   SUPABASE_URL, SUPABASE_ANON_KEY, HCAPTCHA_SITE_KEY,
 *   PUBLIC_SUPPORT_EMAIL, PUBLIC_SUPPORT_PHONE, PUBLIC_COMPANY_NAME, PUBLIC_COMPANY_DOMAIN
 *
 * It injects an inline <script> right before the <script src="/public/js/public-config.js">
 * tag into every *.html file in the publish directory.
 */
const fs = require("fs");
const path = require("path");

const PUBLISH_DIR = path.resolve(__dirname, "..", "public");
const TARGET_MARKER = '/public/js/public-config.js';

const publicKeys = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "HCAPTCHA_SITE_KEY",
  "PUBLIC_SUPPORT_EMAIL",
  "PUBLIC_SUPPORT_PHONE",
  "PUBLIC_COMPANY_NAME",
  "PUBLIC_COMPANY_DOMAIN",
];

function buildInjection() {
  const env = {};
  for (const key of publicKeys) {
    if (process.env[key]) env[key] = process.env[key];
  }
  const json = JSON.stringify(env)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  return (
    "<script>window.__NETLIFY_ENV__ = " + json + ";</script>"
  );
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.name.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

let injected = 0;
const files = walk(PUBLISH_DIR);
for (const file of files) {
  let html = fs.readFileSync(file, "utf8");
  if (!html.includes(TARGET_MARKER)) continue;

  const injection = buildInjection();
  // Remove any previously injected block to keep idempotent
  html = html.replace(/<script>window\.__NETLIFY_ENV__ = .*?<\/script>/g, "");

  const markerIndex = html.indexOf(`<script src="${TARGET_MARKER}"`);
  if (markerIndex === -1) continue;

  const insertionPoint = html.lastIndexOf("<", markerIndex);
  html =
    html.slice(0, insertionPoint) +
    injection +
    html.slice(insertionPoint);

  fs.writeFileSync(file, html, "utf8");
  injected++;
  console.log(`[inject-public-env] Injected env into ${path.relative(process.cwd(), file)}`);
}

console.log(`[inject-public-env] Done. Injected into ${injected} HTML file(s).`);
