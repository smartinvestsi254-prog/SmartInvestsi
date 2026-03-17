/**
 * Admin Crypto Education Content API
 * Upload signals info/images/courses (admin only)
 */

import { Handler } from '@netlify/functions';
import prisma from './lib/prisma';

interface EducationContent {
  title: string;
  content: string;
  imageUrl: string;
  type: 'signal' | 'trade' | 'course';
}

export const handler: Handler = async (event) => {
  const role = event.headers['x-role'];
  if (role !== 'ADMIN') return { statusCode: 403, body: 'Admin only' };

  if (event.httpMethod === 'POST') {
    const data: EducationContent = JSON.parse(event.body || '{}');
    // Save to DB or storage (Netlify Blob/Filecoin)
    // Mock
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  // GET all content
  return { statusCode: 200, body: JSON.stringify({ success: true, data: [] }) };
};

