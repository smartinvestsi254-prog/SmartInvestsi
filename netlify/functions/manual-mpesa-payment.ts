/**
 * Manual M-Pesa Payment Handler (0114383762)
 * Till Number payment with SmartInvestsi name + no reversal policy
 */

import type { Handler } from '@netlify/functions';
import logger from './logger';

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

const mockPayments: ManualPaymentRecord[] = [];  // Production: use DB

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode
