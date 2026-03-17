// src/services/PriceAlertService.ts
import { PrismaClient } from '@prisma/client';
import { checkFeatureAccess } from '../lib/tier-access-control';

const prisma = new PrismaClient();

export class PriceAlertService {
  
  async createAlert(userEmail: string, data: {
    symbol: string;
    targetPrice: number;
    condition: string;
    notifyEmail?: boolean;
    notifySMS?: boolean;
    notifyApp?: boolean;
    expiresAt?: Date;
  }) {
    const access = await checkFeatureAccess(userEmail, 'alerts.price');
    if (!access.allowed) {
      throw new Error(access.reason);
    }

    const activeCount = await prisma.priceAlert.count({
      where: { userEmail, isActive: true }
    });

    const limits: Record<string, number> = { FREE: 5, PREMIUM: 50, ENTERPRISE: -1 };
    const userLimit = limits[access.userTier];
    
    if (userLimit !== -1 && activeCount >= userLimit) {
      throw new Error(`You've reached your ${access.userTier} tier limit of ${userLimit} active alerts`);
    }

    const alert = await prisma.priceAlert.create({
      data: {
        userEmail,
        symbol: data.symbol.toUpperCase(),
        targetPrice: data.targetPrice,
        condition: data.condition as any,
        notifyEmail: data.notifyEmail ?? true,
        notifySMS: data.notifySMS ?? false,
        notifyApp: data.notifyApp ?? true,
        expiresAt: data.expiresAt
      }
    });

    return alert;
  }

  async getAlerts(userEmail: string, activeOnly: boolean = true) {
    const where: any = { userEmail };
    if (activeOnly) {
      where.isActive = true;
      where.isTriggered = false;
    }

    return await prisma.priceAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  async deleteAlert(alertId: string, userEmail: string) {
    const alert = await prisma.priceAlert.findFirst({
      where: { id: alertId, userEmail }
    });

    if (!alert) {
      throw new Error('Alert not found');
    }

    await prisma.priceAlert.update({
      where: { id: alertId },
      data: { isActive: false }
    });

    return { success: true };
  }

  async checkAlerts() {
    const activeAlerts = await prisma.priceAlert.findMany({
      where: {
        isActive: true,
        isTriggered: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    for (const alert of activeAlerts) {
      const quote = await prisma.marketData.findFirst({
        where: { symbol: alert.symbol },
        orderBy: { timestamp: 'desc' }
      });

      if (!quote) continue;

      let triggered = false;
      const currentPrice = quote.price;

      switch (alert.condition) {
        case 'ABOVE':
          triggered = currentPrice >= alert.targetPrice;
          break;
        case 'BELOW':
          triggered = currentPrice <= alert.targetPrice;
          break;
        case 'CROSSES':
          triggered = Math.abs(currentPrice - alert.targetPrice) < 0.01;
          break;
      }

      if (triggered) {
        await this.triggerAlert(alert.id, currentPrice);
      }
    }
  }

  private async triggerAlert(alertId: string, triggeredPrice: number) {
    const alert = await prisma.priceAlert.update({
      where: { id: alertId },
      data: {
        isTriggered: true,
        triggeredAt: new Date(),
        triggeredPrice
      }
    });

    const notifications = [];

    if (alert.notifyEmail) {
      notifications.push(this.sendNotification(alert, 'EMAIL'));
    }
    if (alert.notifySMS) {
      notifications.push(this.sendNotification(alert, 'SMS'));
    }
    if (alert.notifyApp) {
      notifications.push(this.sendNotification(alert, 'PUSH'));
    }

    await Promise.all(notifications);
  }

  private async sendNotification(alert: any, channel: string) {
    const message = `Price Alert: ${alert.symbol} has ${alert.condition.toLowerCase()} $${alert.targetPrice}. Current price: $${alert.triggeredPrice}`;

    try {
      await prisma.notification.create({
        data: {
          userEmail: alert.userEmail,
          type: 'PRICE_ALERT',
          title: `${alert.symbol} Price Alert Triggered`,
          message,
          channel,
          status: 'PENDING',
          priority: 2
        }
      });

      await prisma.alertNotification.create({
        data: {
          alertId: alert.id,
          channel,
          status: 'SENT'
        }
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
      
      await prisma.alertNotification.create({
        data: {
          alertId: alert.id,
          channel,
          status: 'FAILED',
          errorMessage: (error as Error).message
        }
      });
    }
  }
}
