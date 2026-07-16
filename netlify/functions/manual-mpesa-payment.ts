/**
 * Manual M-Pesa Payment Handler (0114383762)
 * Till Number payment with SmartInvestsi name + no reversal policy
 */

import type { Handler } from '@netlify/functions';
import logger from './logger';
import { getCorsHeaders } from './lib/cors';
import { getUserEmailFromEvent } from './lib/auth-utils';

import CONFIG from '../../src/config';
const MPESA_NUMBER = '0114383762';
const BUSINESS_NAME = 'SmartInvestsi';
const CEO_ACCOUNT_ID = CONFIG.CEO_MANUAL_ACCOUNT_ID;

interface ManualPaymentRecord {
  id: string;
  userId: string;
  amount: number;
  mpesaNumber: string;
  tillNumber: string;
  reference: string;
  holderName: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'reversed';
  timestamp: string;
  noReversal: boolean;
}

const manualPayments: ManualPaymentRecord[] = [];

function genRef(): string {
  return `SI-MPESA-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export const handler: Handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const corsHeaders = { 'Content-Type': 'application/json', ...getCorsHeaders(origin) };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    };
  }

  try {
    const userEmail = await getUserEmailFromEvent(event);
    if (!userEmail) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Authentication required' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const amount = Number(body.amount);
    const reference = String(body.reference || '').trim();
    const holderName = String(body.holderName || '').trim();

    if (!amount || amount <= 0 || !reference || !holderName) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'amount, reference and holderName are required' }),
      };
    }

    const record: ManualPaymentRecord = {
      id: genRef(),
      userId: userEmail,
      amount,
      mpesaNumber: MPESA_NUMBER,
      tillNumber: CONFIG.MPESA.SHORTCODE,
      reference,
      holderName,
      status: 'pending',
      timestamp: new Date().toISOString(),
      noReversal: true,
    };
    manualPayments.push(record);

    logger.info('Manual M-Pesa payment submitted', {
      id: record.id,
      userId: userEmail,
      amount,
      business: BUSINESS_NAME,
      ceoAccountId: CEO_ACCOUNT_ID,
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        payment: record,
        notice: 'Manual M-Pesa payments to SmartInvestsi are non-reversible. Confirmation is processed by an administrator.',
      }),
    };
  } catch (error) {
    logger.error('Manual M-Pesa payment error', { error: (error as Error).message });
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Internal server error' }),
    };
  }
};
