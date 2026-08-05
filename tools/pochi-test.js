/**
 * M-Pesa Pochi Testing & Simulation
 * For development and testing purposes
 */

const MpesaPochi = require('../src/lib/mpesa-pochi');

/**
 * Simulate a complete Pochi payment flow
 */
async function simulateCompletePayment() {
  console.log('=== M-Pesa Pochi Payment Simulation ===\n');

  const pochi = new MpesaPochi({
    consumerKey: process.env.MPESA_CONSUMER_KEY,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET,
    businessShortCode: process.env.MPESA_NUMBER || '171414',
    passKey: process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
    callbackUrl: 'https://localhost:3000/api/pochi/callback',
    pochiAccountName: 'SmartInvest',
    env: 'sandbox'
  });

  try {
    // Step 1: Test authentication
    console.log('1. Testing M-Pesa Authentication...');
    const token = await pochi.getAccessToken();
    console.log('   ✓ Authentication successful');
    console.log(`   Token: ${token.substring(0, 20)}...\n`);

    // Step 2: Format phone number
    console.log('2. Testing Phone Number Formatting...');
    const testPhones = [
      '+254700000000',
      '0700000000',
      '254700000000',
      '700000000'
    ];

    testPhones.forEach(phone => {
      const formatted = pochi.formatPhoneNumber(phone);
      console.log(`   ${phone.padEnd(15)} → ${formatted}`);
    });
    console.log();

    // Step 3: STK Push Simulation
    console.log('3. Simulating STK Push Request...');
    const stkResult = await pochi.stkPush(
      '254700000000',
      100,
      'Order-SmartInvest-001'
    );

    if (stkResult.success) {
      console.log('   ✓ STK Push successful');
      console.log(`   Checkout ID: ${stkResult.checkoutRequestId}`);
      console.log(`   Message: ${stkResult.message}\n`);

      // Step 4: Query STK Status
      console.log('4. Querying STK Status...');
      const statusResult = await pochi.querySTKStatus(stkResult.checkoutRequestId);
      console.log('   Status Query Result:');
      console.log(`   - Response Code: ${statusResult.responseCode}`);
      console.log(`   - Response Desc: ${statusResult.responseDesc}\n`);
    } else {
      console.log(`   ✗ STK Push failed: ${stkResult.error}\n`);
    }

    // Step 5: Simulate callback processing
    console.log('5. Simulating Payment Callback...');
    const mockCallback = {
      Body: {
        stkCallback: {
          MerchantRequestID: '16683-1259-1',
          CheckoutRequestID: 'ws_CO_DMZ_test_123',
          ResultCode: 0,
          ResultDesc: 'The service request has been accepted successfully',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 100 },
              { Name: 'MpesaReceiptNumber', Value: 'NLJ7RT61SV' },
              { Name: 'TransactionDate', Value: 20231117063845 },
              { Name: 'PhoneNumber', Value: 254700000000 }
            ]
          }
        }
      }
    };

    const callbackValidation = pochi.validateCallback(mockCallback);
    console.log('   Callback Validation:');
    console.log(`   - Valid: ${callbackValidation.valid}`);
    console.log(`   - Status: ${callbackValidation.status}`);
    if (callbackValidation.valid) {
      console.log(`   - Receipt: ${callbackValidation.mpesaReceiptNumber}`);
      console.log(`   - Amount: KES ${callbackValidation.amount}`);
      console.log(`   - Phone: ${callbackValidation.phoneNumber}`);
      console.log(`   - Date: ${callbackValidation.transactionDate}\n`);
    }

    // Step 6: Account Info
    console.log('6. Account Configuration:');
    console.log(`   - Name: ${pochi.pochiAccountName}`);
    console.log(`   - Short Code: ${pochi.businessShortCode}`);
    console.log(`   - Environment: ${pochi.env}`);
    console.log(`   - Callback URL: ${pochi.callbackUrl}\n`);

    // Step 7: Transaction reference generation
    console.log('7. Sample Generated Transaction References:');
    for (let i = 0; i < 3; i++) {
      console.log(`   ${pochi.generateTransactionRef()}`);
    }
    console.log();

    console.log('=== Simulation Complete ===');
    console.log('\nKey Integration Points:');
    console.log('✓ STK Push → Sends payment prompt to user phone');
    console.log('✓ Query Status → Check if payment was completed');
    console.log('✓ Callback → Receive real-time payment notification');
    console.log('✓ B2C Payment → Send money to users (admin only)');
    console.log('✓ Balance Check → Monitor account balance (admin only)');

  } catch (error) {
    console.error('✗ Simulation Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Verify MPESA_CONSUMER_KEY in .env');
    console.error('2. Verify MPESA_CONSUMER_SECRET in .env');
    console.error('3. Check internet connection');
    console.error('4. Ensure Safaricom API is accessible');
  }
}

/**
 * Test callback validation with various scenarios
 */
function testCallbackScenarios() {
  console.log('=== Testing Callback Validation Scenarios ===\n');

  const pochi = new MpesaPochi({ pochiAccountName: 'SmartInvest' });

  // Scenario 1: Successful payment
  console.log('Scenario 1: Successful Payment');
  const successCallback = {
    Body: {
      stkCallback: {
        CheckoutRequestID: 'ws_CO_001',
        ResultCode: 0,
        ResultDesc: 'Success',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: 500 },
            { Name: 'MpesaReceiptNumber', Value: 'REC001' },
            { Name: 'TransactionDate', Value: 20231117120000 },
            { Name: 'PhoneNumber', Value: 254700000000 }
          ]
        }
      }
    }
  };
  let result = pochi.validateCallback(successCallback);
  console.log(`✓ Status: ${result.status}`);
  console.log(`  Receipt: ${result.mpesaReceiptNumber}\n`);

  // Scenario 2: User cancelled
  console.log('Scenario 2: User Cancelled Payment');
  const cancelCallback = {
    Body: {
      stkCallback: {
        CheckoutRequestID: 'ws_CO_002',
        ResultCode: 1,
        ResultDesc: 'User cancelled the transaction',
        CallbackMetadata: { Item: [] }
      }
    }
  };
  result = pochi.validateCallback(cancelCallback);
  console.log(`✗ Status: ${result.status}`);
  console.log(`  Reason: ${result.resultDesc}\n`);

  // Scenario 3: Request timeout
  console.log('Scenario 3: Request Timeout');
  const timeoutCallback = {
    Body: {
      stkCallback: {
        CheckoutRequestID: 'ws_CO_003',
        ResultCode: 1032,
        ResultDesc: 'Request timeout',
        CallbackMetadata: { Item: [] }
      }
    }
  };
  result = pochi.validateCallback(timeoutCallback);
  console.log(`✗ Status: ${result.status}`);
  console.log(`  Code: ${result.resultCode}\n`);

  console.log('=== Callback Testing Complete ===');
}

/**
 * Demonstrate API response handling
 */
function demonstrateResponseHandling() {
  console.log('=== API Response Handling Examples ===\n');

  // STK Push Response
  console.log('1. STK Push Response:');
  const stkResponse = {
    success: true,
    requestId: '16683-1259-1',
    responseCode: '0',
    checkoutRequestId: 'ws_CO_DMZ_xxx',
    message: 'STK prompt sent successfully'
  };
  console.log(JSON.stringify(stkResponse, null, 2));
  console.log('\n→ Use checkoutRequestId for polling and webhooks\n');

  // Query Response
  console.log('2. Query Status Response:');
  const queryResponse = {
    success: true,
    responseCode: '0',
    resultCode: 0,
    resultDesc: 'Service accepted',
    merchantRequestId: '16683-1259-1',
    checkoutRequestId: 'ws_CO_DMZ_xxx'
  };
  console.log(JSON.stringify(queryResponse, null, 2));
  console.log('\n→ resultCode 0 = Success, 1 = Failed, 1032 = Timeout\n');

  // Callback Response
  console.log('3. Callback Webhook Format:');
  const callbackResponse = {
    Body: {
      stkCallback: {
        MerchantRequestID: '16683-1259-1',
        CheckoutRequestID: 'ws_CO_DMZ_xxx',
        ResultCode: 0,
        ResultDesc: 'Success',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: 100 },
            { Name: 'MpesaReceiptNumber', Value: 'NLJ7RT61SV' },
            { Name: 'TransactionDate', Value: 20231117063845 },
            { Name: 'PhoneNumber', Value: 254700000000 }
          ]
        }
      }
    }
  };
  console.log(JSON.stringify(callbackResponse, null, 2));
  console.log('\n→ Parse CallbackMetadata.Item to extract transaction details\n');
}

// Run simulations
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--full')) {
    simulateCompletePayment();
  } else if (args.includes('--callbacks')) {
    testCallbackScenarios();
  } else if (args.includes('--responses')) {
    demonstrateResponseHandling();
  } else {
    console.log('M-Pesa Pochi Simulation Tool\n');
    console.log('Usage:');
    console.log('  npm run simulate:pochi:full       - Run complete payment flow');
    console.log('  npm run simulate:pochi:callbacks  - Test callback validation');
    console.log('  npm run simulate:pochi:responses  - Show response formats\n');
    console.log('Add to package.json:');
    console.log('  "simulate:pochi:full": "node tools/pochi-test.js --full"');
    console.log('  "simulate:pochi:callbacks": "node tools/pochi-test.js --callbacks"');
    console.log('  "simulate:pochi:responses": "node tools/pochi-test.js --responses"');
  }
}

module.exports = {
  simulateCompletePayment,
  testCallbackScenarios,
  demonstrateResponseHandling
};
