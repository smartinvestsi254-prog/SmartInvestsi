import checkFeatureAccess from '../lib/tier-access-control';
import dbClient from '../lib/db-client';

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

    return await prisma.product.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        category: data.category,
        inventory: data.inventory ?? null,
        status: 'DRAFT'
      }
    });
  }

  // List products (tier-gated: verified access check)
  async getProducts(userEmail: string, category?: string) {
    const access = await checkFeatureAccess(userEmail, 'marketplace.view');
    if (!access.allowed) {
      throw new Error(access.reason || 'Access denied');
    }

    const where = category ? { category, status: 'PUBLISHED' } : { status: 'PUBLISHED' };

    return await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        category: true,
        inventory: true,
        createdAt: true,
        _count: {
          select: {
            orders: {
              where: { status: 'COMPLETED' }
            }
          }
        }
      }
    });
  }

  // Create order with transactional inventory locking
  async createOrder(userEmail: string, productId: string, quantity: number) {
    if (quantity <= 0) throw new Error('Quantity must be greater than 0');

    const access = await checkFeatureAccess(userEmail, 'marketplace.order');
    if (!access.allowed) throw new Error(access.reason || 'Access denied');

    // Run inventory update and order creation inside an interactive transaction
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });

      if (!product || product.status !== 'PUBLISHED') {
        throw new Error('Product not available');
      }

      // Check and update inventory atomically if tracked
      if (product.inventory !== null) {
        if (quantity > product.inventory) {
          throw new Error('Insufficient inventory');
        }

        await tx.product.update({
          where: { id: productId },
          data: { inventory: { decrement: quantity } }
        });
      }

      const total = product.price * quantity;

      const order = await tx.order.create({
        data: {
          userEmail,
          productId,
          quantity,
          totalAmount: total,
          status: 'PENDING_PAYMENT',
          shippingAddress: null
        },
        include: { product: true }
      });

      // Fraud check execution
      const riskScore = Math.random(); // Placeholder
      if (riskScore > 0.8) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'FLAGGED_FRAUD' }
        });
        throw new Error('Order flagged for fraud review');
      }

      return order;
    });
  }

  // Update order status (payment/shipping)
  async updateOrderStatus(
    adminEmail: string, 
    orderId: string, 
    status: 'PAID' | 'SHIPPED' | 'DELIVERED', 
    tracking?: string
  ) {
    const access = await checkFeatureAccess(adminEmail, 'marketplace.admin');
    if (!access.allowed || !access.isAdmin) throw new Error('Admin required');

    return await prisma.order.update({
      where: { id: orderId },
      data: { status, trackingNumber: tracking },
      include: { product: true }
    });
  }

  // Get user orders
  async getUserOrders(userEmail: string) {
    return await prisma.order.findMany({
      where: { userEmail },
      orderBy: { createdAt: 'desc' },
      include: { product: true }
    });
  }
    }
      
