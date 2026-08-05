import { PrismaClient } from '@prisma/client';
import { checkFeatureAccess } from '../../lib/tier-access-control';
import { dbClient } from '../../lib/db-client';

const prisma = dbClient.getClient();

export class MarketplaceService {
  // Create product (admin only)
  async createProduct(adminEmail: string, data: {
    title: string;
    description: string;
    price: number;
    category: string;
    inventory?: number;
  }) {
    const access = await checkFeatureAccess(adminEmail, 'marketplace.admin');
    if (!access.allowed || !access.isAdmin) {
      throw new Error('Admin access required');
    }

    const product = await prisma.product.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        category: data.category,
        inventory: data.inventory || null,
        status: 'DRAFT'
      }
    });

    return product;
  }

  // List products (tier-gated: premium sees all)
  async getProducts(userEmail: string, category?: string) {
    const access = await checkFeatureAccess(userEmail, 'marketplace.view');
    
    const where = category ? { category, status: 'PUBLISHED' } : { status: 'PUBLISHED' };
    
    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { orders: { where: { status: 'COMPLETED' }, _count: true } }
    });

    return products;
  }

  // Create order
  async createOrder(userEmail: string, productId: string, quantity: number) {
    const access = await checkFeatureAccess(userEmail, 'marketplace.order');
    if (!access.allowed) throw new Error(access.reason);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'PUBLISHED') {
      throw new Error('Product not available');
    }

    const total = product.price * quantity;
    if (product.inventory && quantity > product.inventory) {
      throw new Error('Insufficient inventory');
    }

    const order = await prisma.order.create({
      data: {
        userEmail,
        productId,
        quantity,
        totalAmount: total,
        status: 'PENDING_PAYMENT',
        shippingAddress: null // Updated after payment
      },
      include: { product: true }
    });

    // Fraud check stub (integrate fraud-api.ts)
    await this.runFraudCheck(order.id, { amount: total, userEmail });

    return order;
  }

  // Update order status (payment/shipping)
  async updateOrderStatus(adminEmail: string, orderId: string, status: 'PAID' | 'SHIPPED' | 'DELIVERED', tracking?: string) {
    const access = await checkFeatureAccess(adminEmail, 'marketplace.admin');
    if (!access.isAdmin) throw new Error('Admin required');

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status, trackingNumber: tracking },
      include: { product: true, user: { select: { email: true } } }
    });

    return order;
  }

  // Get user orders
  async getUserOrders(userEmail: string) {
    const orders = await prisma.order.findMany({
      where: { userEmail },
      orderBy: { createdAt: 'desc' },
      include: { product: true }
    });
    return orders;
  }

  private async runFraudCheck(orderId: string, context: any) {
    // Integrate with fraud-api.ts logic
    const riskScore = Math.random(); // Mock
    if (riskScore > 0.8) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'FLAGGED_FRAUD' }
      });
      throw new Error('Order flagged for fraud review');
    }
  }
}

