import type { HandlerEvent, HandlerResponse } from '@netlify/functions';
import { PrismaClient } from '@prisma/client';
import type { NetlifyResponse } from './NetlifyResponse';
// MarketplaceService not available in Netlify context - use direct Prisma
import { getUserEmailFromEvent } from './lib/auth-utils';

const prisma = new PrismaClient();
const marketplaceService = new MarketplaceService();

export default async (event: HandlerEvent): Promise<HandlerResponse> => {
  const path = event.path.replace('/.netlify/functions/marketplace', '');
  
  try {
    const userEmail = await getUserEmailFromEvent(event);
    const isAdmin = await isAdminRequest(event);

    if (path === '/products' && event.httpMethod === 'GET') {
      const category = event.queryStringParameters?.category;
      const products = await marketplaceService.getProducts(userEmail!, category);
      return new NetlifyResponse(200, products);
    }

    if (path === '/products' && event.httpMethod === 'POST') {
      if (!isAdmin) return new NetlifyResponse(403, { error: 'Admin required' });
      const data = JSON.parse(event.body || '{}');
      const product = await marketplaceService.createProduct(userEmail!, data);
      return new NetlifyResponse(201, product);
    }

    if (path.startsWith('/orders') && event.httpMethod === 'POST') {
      const data = JSON.parse(event.body || '{}');
      const order = await marketplaceService.createOrder(userEmail!, data.productId, data.quantity);
      return new NetlifyResponse(201, order);
    }

    if (path.startsWith('/orders') && event.httpMethod === 'GET') {
      const orders = await marketplaceService.getUserOrders(userEmail!);
      return new NetlifyResponse(200, orders);
    }

    if (path.startsWith('/admin/orders/') && event.httpMethod === 'PATCH') {
      if (!isAdmin) return new NetlifyResponse(403, { error: 'Admin required' });
      const orderId = path.split('/')[3];
      const data = JSON.parse(event.body || '{}');
      const order = await marketplaceService.updateOrderStatus(userEmail!, orderId, data.status, data.tracking);
      return new NetlifyResponse(200, order);
    }

    return new NetlifyResponse(404, { error: 'Not found' });
  } catch (error) {
    console.error('Marketplace API error:', error);
    return new NetlifyResponse(400, { error: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

async function isAdminRequest(event: HandlerEvent): Promise<boolean> {
  // Stub: integrate with admin-api.ts logic
  const auth = event.headers.authorization;
  return auth === `Bearer ${process.env.ADMIN_TOKEN}`;
}

