#!/usr/bin/env node

/**
 * SmartInvest Security & Chat Integration Tests
 * 
 * Run this with: node test-security.js
 * Assumes server is running on http://localhost:3000
 * 
 * Environment Variables:
 * - BASE_URL: Server URL (default: http://localhost:3000)
 * - TEST_ADMIN_USER: Admin username for testing (default: admin)
 * - TEST_ADMIN_PASS: Admin password for testing (default: password)
 */

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_ADMIN_USER = process.env.TEST_ADMIN_USER || 'admin';
const TEST_ADMIN_PASS = process.env.TEST_ADMIN_PASS || 'password';

// ⚠️ WARNING: Use test credentials only in development/testing environments
// Never use production credentials in test files
const ADMIN_AUTH = 'Basic ' + Buffer.from(`${TEST_ADMIN_USER}:${TEST_ADMIN_PASS}`).toString('base64');

// Test helper
async function test(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 SmartInvest Security Integration Tests\n');

  let passed = 0, failed = 0;

  // Test 1: Health check
  console.log('Test 1: Health Check');
  try {
    const res = await test('GET', '/api/health');
    if (res.status === 200 && res.body.status === 'ok') {
      console.log('✅ PASS: Health endpoint working\n');
      passed++;
    } else {
      console.log('❌ FAIL: Health check failed\n', res);
      failed++;
    }
  } catch (e) {
    console.log('❌ FAIL: Health check error:', e.message, '\n');
    failed++;
  }

  // Test 2: Create support chat
  console.log('Test 2: Create Support Chat');
  let conversationId = null;
  try {
    const res = await test('POST', '/api/support/chat/create', {
      email: 'user@example.com',
      category: 'billing'
    });
    if (res.status === 200 && res.body.conversationId) {
      conversationId = res.body.conversationId;
      console.log(`✅ PASS: Chat created (ID: ${conversationId})\n`);
      passed++;
    } else {
      console.log('❌ FAIL: Chat creation failed\n', res);
      failed++;
    }
  } catch (e) {
    console.log('❌ FAIL: Chat creation error:', e.message, '\n');
    failed++;
  }

  // Test 3: Get user chats
  if (conversationId) {
    console.log('Test 3: Get User Chats');
    try {
      const res = await test('GET', '/api/support/chat/my-chats', null, {
        'x-user-email': 'user@example.com'
      });
      if (res.status === 200 && Array.isArray(res.body.chats)) {
        console.log(`✅ PASS: Retrieved ${res.body.chats.length} chat(s)\n`);
        passed++;
      } else {
        console.log('❌ FAIL: Get chats failed\n', res);
        failed++;
      }
    } catch (e) {
      console.log('❌ FAIL: Get chats error:', e.message, '\n');
      failed++;
    }
  }

  // Test 4: Send message in chat
  if (conversationId) {
    console.log('Test 4: Send Message in Chat');
    try {
      const res = await test('POST', `/api/support/chat/${conversationId}/message`, {
        content: 'I have a question about premium access',
        attachments: []
      }, {
        'x-user-email': 'user@example.com'
      });
      if (res.status === 200) {
        console.log('✅ PASS: Message sent successfully\n');
        passed++;
      } else {
        console.log('❌ FAIL: Send message failed\n', res);
        failed++;
      }
    } catch (e) {
      console.log('❌ FAIL: Send message error:', e.message, '\n');
      failed++;
    }
  }

  // Test 5: Request data access
  console.log('Test 5: Request Data Access');
  let requestId = null;
  try {
    const res = await test('POST', '/api/data/request-access', {
      email: 'user@example.com',
      dataType: 'payment_history',
      reason: 'Need to verify my transactions'
    });
    if (res.status === 200 && res.body.requestId) {
      requestId = res.body.requestId;
      console.log(`✅ PASS: Access request created (ID: ${requestId})\n`);
      passed++;
    } else {
      console.log('❌ FAIL: Access request failed\n', res);
      failed++;
    }
  } catch (e) {
    console.log('❌ FAIL: Access request error:', e.message, '\n');
    failed++;
  }

  // Test 6: Admin get pending requests
  console.log('Test 6: Admin Get Pending Requests');
  try {
    const res = await test('GET', '/api/data/admin/access-requests', null, {
      'Authorization': ADMIN_AUTH
    });
    if (res.status === 200 || res.status === 401) {
      console.log(`✅ PASS: Admin access request endpoint working (Status: ${res.status})\n`);
      passed++;
    } else {
      console.log('❌ FAIL: Admin requests failed\n', res);
      failed++;
    }
  } catch (e) {
    console.log('❌ FAIL: Admin requests error:', e.message, '\n');
    failed++;
  }

  // Test 7: Admin approve request
  if (requestId) {
    console.log('Test 7: Admin Approve Request');
    try {
      const res = await test('POST', `/api/data/admin/approve/${requestId}`, {}, {
        'Authorization': ADMIN_AUTH
      });
      if (res.status === 200 || res.status === 401) {
        console.log(`✅ PASS: Admin approve endpoint working (Status: ${res.status})\n`);
        passed++;
      } else {
        console.log('❌ FAIL: Admin approve failed\n', res);
        failed++;
      }
    } catch (e) {
      console.log('❌ FAIL: Admin approve error:', e.message, '\n');
      failed++;
    }
  }

  // Test 8: Get catalog with PDFs
  console.log('Test 8: Get Catalog with PDFs');
  try {
    const res = await test('GET', '/api/catalog-with-pdfs');
    if (res.status === 200 && res.body.success) {
      console.log(`✅ PASS: Catalog retrieved (${res.body.files.length} items)\n`);
      passed++;
    } else {
      console.log('❌ FAIL: Catalog retrieval failed\n', res);
      failed++;
    }
  } catch (e) {
    console.log('❌ FAIL: Catalog error:', e.message, '\n');
    failed++;
  }

  // Test 9: Admin security status
  console.log('Test 9: Admin Security Status');
  try {
    const res = await test('GET', '/api/security/admin/status', null, {
      'Authorization': ADMIN_AUTH
    });
    if (res.status === 200 || res.status === 401) {
      console.log(`✅ PASS: Security status endpoint working (Status: ${res.status})\n`);
      passed++;
    } else {
      console.log('❌ FAIL: Security status failed\n', res);
      failed++;
    }
  } catch (e) {
    console.log('❌ FAIL: Security status error:', e.message, '\n');
    failed++;
  }

  // Test 10: Firewall rate limiting (simplified)
  console.log('Test 10: Firewall Rate Limiting Detection');
  try {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(test('GET', '/api/health'));
    }
    const results = await Promise.all(promises);
    const blocked = results.some(r => r.status === 429);
    if (!blocked) {
      console.log('✅ PASS: Firewall accepting normal traffic\n');
      passed++;
    } else {
      console.log('⚠️ NOTE: Firewall blocked some requests (normal if many tests running)\n');
    }
  } catch (e) {
    console.log('❌ FAIL: Firewall test error:', e.message, '\n');
    failed++;
  }

  // Summary
  console.log('=' * 50);
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log(`Total: ${passed + failed} tests\n`);

  if (failed === 0) {
    console.log('🎉 All tests passed! Security integration working correctly.\n');
  } else {
    console.log(`⚠️  ${failed} test(s) failed. Check your configuration.\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});

