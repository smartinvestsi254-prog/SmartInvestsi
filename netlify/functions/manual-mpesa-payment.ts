/**
 * Manual M-Pesa Payment Handler (0114383762)
 * Till Number payment with SmartInvestsi name + no reversal policy
 */

import type { Handler } from '@netlify/functions';
import logger from './logger';

const MPESA_TILL_NUMBER = '0114383762';
const BUSINESS_NAME = 'SmartInvestsi';
const CEO_ACCOUNT_ID = process.env.CEO_ACCOUNT_ID || 'ceo_manual';

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

const mockPayments: ManualPaymentRecord[] = [];  // Production: use DB

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode
