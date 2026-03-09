// src/services/NotificationService.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationService {
  
  async createNotification(data: {
    userEmail: string;
    type: string;
    title: string;
    message: string;
    priority?: string;
    actionUrl?: string;
  }) {
    return await prisma.notification.create({
      data: {
        userEmail: data.userEmail,
        type: data.type as any,
        title: data.title,
        message: data.message,
        priority: (data.priority as any) || 'NORMAL',
        actionUrl: data.actionUrl
      }
    });
  }

  async getNotifications(userEmail: string, unreadOnly: boolean = false) {
    const where: any = { userEmail };
    if (unreadOnly) {
      where.isRead = false;
    }

    return await prisma.notification.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 50
    });
  }

  async markAsRead(notificationId: string, userEmail: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userEmail }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return { success: true };
  }

  async markAllAsRead(userEmail: string) {
    await prisma.notification.updateMany({
      where: {
        userEmail,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return { success: true };
  }

  async deleteNotification(notificationId: string, userEmail: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userEmail }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await prisma.notification.delete({
      where: { id: notificationId }
    });

    return { success: true };
  }

  async getUnreadCount(userEmail: string) {
    return await prisma.notification.count({
      where: {
        userEmail,
        isRead: false
      }
    });
  }

  async sendPriceAlert(userEmail: string, symbol: string, currentPrice: number, targetPrice: number) {
    const direction = currentPrice >= targetPrice ? 'above' : 'below';
    
    return await this.createNotification({
      userEmail,
      type: 'PRICE_ALERT',
      title: `${symbol} Price Alert`,
      message: `${symbol} is now ${direction} your target price of $${targetPrice.toFixed(2)} (Current: $${currentPrice.toFixed(2)})`,
      priority: 'HIGH',
      actionUrl: `/portfolio?symbol=${symbol}`
    });
  }

  async sendTradeNotification(userEmail: string, symbol: string, action: string, quantity: number, price: number) {
    return await this.createNotification({
      userEmail,
      type: 'TRADE_EXECUTED',
      title: `Trade Executed: ${action} ${symbol}`,
      message: `Successfully ${action.toLowerCase()} ${quantity} shares of ${symbol} at $${price.toFixed(2)}`,
      priority: 'NORMAL',
      actionUrl: '/portfolio'
    });
  }

  async sendDividendNotification(userEmail: string, symbol: string, amount: number) {
    return await this.createNotification({
      userEmail,
      type: 'DIVIDEND_RECEIVED',
      title: `Dividend Received: ${symbol}`,
      message: `You received a dividend payment of $${amount.toFixed(2)} from ${symbol}`,
      priority: 'NORMAL',
      actionUrl: '/portfolio'
    });
  }

  async sendRebalanceRecommendation(userEmail: string, portfolioName: string) {
    return await this.createNotification({
      userEmail,
      type: 'REBALANCE_RECOMMENDATION',
      title: `Portfolio Rebalancing Recommended`,
      message: `Your portfolio "${portfolioName}" has drifted from target allocations`,
      priority: 'HIGH',
      actionUrl: '/portfolio'
    });
  }
}
