import type { HandlerEvent, HandlerResponse } from '@netlify/functions';
import { PrismaClient } from '@prisma/client';
import { MarketplaceService } from '../../src/services/MarketplaceService';
import { getUserEmailFromEvent, isAdminFromEvent } from './lib/auth-utils';
import { getCorsHeaders } from './lib/cors';

const prisma = new PrismaClient();
const marketplaceService = new MarketplaceService();

function response(statusCode: number, payload: unknown, origin = ''): HandlerResponse {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(origin) },
    body: JSON.stringify(payload),
  };
}

export default async (event: HandlerEvent): Promise<HandlerResponse> => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const path = event.path.replace('/.netlify/functions/marketplace', '');

  try {
    const userEmail = await getUserEmailFromEvent(event);
    const isAdmin = await isAdminFromEvent(event);

    if (path === '/products' && event.httpMethod === 'GET') {
      const category = event.queryStringParameters?.category;
      const products = await marketplaceService.getProducts(userEmail!, category);
      return response(200, products, origin);
    }

    if (path === '/products' && event.httpMethod === 'POST') {
      if (!isAdmin) return response(403, { error: 'Admin required' }, origin);
      const data = JSON.parse(event.body || '{}');
      const product = await marketplaceService.createProduct(userEmail!, data);
      return response(201, product, origin);
    }

    if (path.startsWith('/orders') && event.httpMethod === 'POST') {
      const data = JSON.parse(event.body || '{}');
      const order = await marketplaceService.createOrder(userEmail!, data.productId, data.quantity);
      return response(201, order, origin);
    }

    if (path.startsWith('/orders') && event.httpMethod === 'GET') {
      const orders = await marketplaceService.getUserOrders(userEmail!);
      return response(200, orders, origin);
    }

    if (path.startsWith('/admin/orders/') && event.httpMethod === 'PATCH') {
      if (!isAdmin) return response(403, { error: 'Admin required' }, origin);
      const orderId = path.split('/')[3];
      const data = JSON.parse(event.body || '{}');
      const order = await marketplaceService.updateOrderStatus(userEmail!, orderId, data.status, data.tracking);
      return response(200, order, origin);
    }

    return response(404, { error: 'Not found' }, origin);
  } catch (error: any) {
    console.error('Marketplace API error:', error);
    return response(400, { error: error?.message || 'Bad request' }, origin);
  } finally {
    await prisma.$disconnect();
  }
};

