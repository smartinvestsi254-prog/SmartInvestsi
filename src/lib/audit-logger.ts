// src/lib/audit-logger.ts
// Comprehensive audit logging for all feature access and admin actions
import { PrismaClient, AuditLogEventType, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export enum AuditEventType {
  FEATURE_ACCESS_GRANTED = 'FEATURE_ACCESS_GRANTED',
  FEATURE_ACCESS_DENIED = 'FEATURE_ACCESS_DENIED',
  TIER_GRANTED = 'TIER_GRANTED',
  TIER_REVOKED = 'TIER_REVOKED',
  ADMIN_ACTION = 'ADMIN_ACTION',
  USER_CREATED = 'USER_CREATED',
  PORTFOLIO_CREATED = 'PORTFOLIO_CREATED',
  PORTFOLIO_DELETED = 'PORTFOLIO_DELETED',
  TRANSACTION_EXECUTED = 'TRANSACTION_EXECUTED',
  ALERT_CREATED = 'ALERT_CREATED',
  ALERT_TRIGGERED = 'ALERT_TRIGGERED',
  ERROR_DETECTED = 'ERROR_DETECTED',
  SECURITY_EVENT = 'SECURITY_EVENT'
}

export interface AuditLog {
  eventType: AuditEventType;
  userId?: string;
  userEmail?: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  timestamp?: Date;
}

export class AuditLogger {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Log feature access attempts
   */
  async logFeatureAccess(
    userEmail: string,
    featureName: string,
    userTier: string,
    tierRequired: string,
    allowed: boolean,
    reason?: string,
    metadata?: Record<string, any>,
    req?: any
  ): Promise<void> {
    try {
      const eventType = allowed 
        ? AuditEventType.FEATURE_ACCESS_GRANTED 
        : AuditEventType.FEATURE_ACCESS_DENIED;

      await this.prisma.auditLog.create({
        data: {
          eventType,
          userEmail,
          action: `${allowed ? 'Accessed' : 'Denied access to'} feature: ${featureName}`,
          details: {
            feature: featureName,
            userTier,
            tierRequired,
            allowed,
            reason,
            metadata
          } as any,
          ipAddress: req?.ip || 'unknown',
          userAgent: req?.headers['user-agent'] || 'unknown',
          success: allowed
        }
      });
    } catch (error) {
      console.error('Error logging feature access:', error);
    }
  }

  /**
   * Log tier grant/revoke actions (admin actions)
   */
  async logTierAction(
    userId: string,
    userEmail: string,
    actionType: 'GRANT' | 'REVOKE',
    tier: string,
    adminEmail: string,
    daysValid?: number,
    reason?: string,
    req?: any
  ): Promise<void> {
    try {
      const eventType = actionType === 'GRANT' 
        ? AuditEventType.TIER_GRANTED 
        : AuditEventType.TIER_REVOKED;

      await this.prisma.auditLog.create({
        data: {
          eventType,
          userEmail: adminEmail,
          action: `Admin ${actionType === 'GRANT' ? 'granted' : 'revoked'} ${tier} tier to ${userEmail}`,
          details: {
            targetUserId: userId,
            targetUserEmail: userEmail,
            tier,
            actionType,
            daysValid,
            reason,
            adminEmail
          } as any,
          ipAddress: req?.ip || 'unknown',
          userAgent: req?.headers['user-agent'] || 'unknown',
          success: true
        }
      });
    } catch (error) {
      console.error('Error logging tier action:', error);
    }
  }

  /**
   * Log admin actions
   */
  async logAdminAction(
    adminEmail: string,
    action: string,
    targetUser?: string,
    details?: Record<string, any>,
    success: boolean = true,
    errorMessage?: string,
    req?: any
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          eventType: AuditEventType.ADMIN_ACTION,
          userEmail: adminEmail,
          action: `[ADMIN] ${action}${targetUser ? ` on ${targetUser}` : ''}`,
          details: details as any,
          ipAddress: req?.ip || 'unknown',
          userAgent: req?.headers['user-agent'] || 'unknown',
          success,
          errorMessage
        }
      });
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  }

  /**
   * Log user events (creation, deletion, updates)
   */
  async logUserEvent(
    userEmail: string,
    eventType: AuditEventType,
    action: string,
    details?: Record<string, any>,
    success: boolean = true,
    errorMessage?: string,
    req?: any
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          eventType,
          userEmail,
          action,
          details: details as any,
          ipAddress: req?.ip || 'unknown',
          userAgent: req?.headers['user-agent'] || 'unknown',
          success,
          errorMessage
        }
      });
    } catch (error) {
      console.error('Error logging user event:', error);
    }
  }

  /**
   * Log feature usage (portfolios, alerts, transactions)
   */
  async logFeatureUsage(
    userEmail: string,
    featureName: string,
    action: string,
    details?: Record<string, any>,
    success: boolean = true,
    errorMessage?: string,
    req?: any
  ): Promise<void> {
    try {
      let eventType: AuditEventType = AuditEventType.ADMIN_ACTION;
      
      if (featureName.includes('portfolio')) {
        eventType = action === 'CREATE' ? AuditEventType.PORTFOLIO_CREATED : AuditEventType.PORTFOLIO_DELETED;
      } else if (featureName.includes('transaction')) {
        eventType = AuditEventType.TRANSACTION_EXECUTED;
      } else if (featureName.includes('alert')) {
        eventType = action === 'CREATE' ? AuditEventType.ALERT_CREATED : AuditEventType.ALERT_TRIGGERED;
      }

      await this.prisma.auditLog.create({
        data: {
          eventType,
          userEmail,
          action: `${action} ${featureName}`,
          details: {
            feature: featureName,
            action,
            ...details
          } as any,
          ipAddress: req?.ip || 'unknown',
          userAgent: req?.headers['user-agent'] || 'unknown',
          success,
          errorMessage
        }
      });
    } catch (error) {
      console.error('Error logging feature usage:', error);
    }
  }

  /**
   * Log errors and security events
   */
  async logErrorEvent(
    userEmail: string,
    eventType: AuditEventType,
    action: string,
    errorMessage: string,
    details?: Record<string, any>,
    req?: any
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          eventType,
          userEmail,
          action,
          details: details as any,
          ipAddress: req?.ip || 'unknown',
          userAgent: req?.headers['user-agent'] || 'unknown',
          success: false,
          errorMessage
        }
      });
    } catch (error) {
      console.error('Error logging error event:', error);
    }
  }

  /**
   * Get audit logs for a user
   */
  async getUserLogs(
    userEmail: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    try {
      return await this.prisma.auditLog.findMany({
        where: { userEmail },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });
    } catch (error) {
      console.error('Error fetching user logs:', error);
      return [];
    }
  }

  /**
   * Get audit logs (admin only)
   */
  async getAllLogs(
    filter?: {
      eventType?: AuditEventType;
      userEmail?: string;
      success?: boolean;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const where: any = {};

      if (filter?.eventType) where.eventType = filter.eventType;
      if (filter?.userEmail) where.userEmail = filter.userEmail;
      if (filter?.success !== undefined) where.success = filter.success;
      
      if (filter?.startDate || filter?.endDate) {
        where.createdAt = {};
        if (filter.startDate) where.createdAt.gte = filter.startDate;
        if (filter.endDate) where.createdAt.lte = filter.endDate;
      }

      return await this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(startDate: Date, endDate: Date): Promise<Record<string, any>> {
    try {
      const logs = await this.prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const stats = {
        totalEvents: logs.length,
        successfulEvents: logs.filter(l => l.success).length,
        failedEvents: logs.filter(l => !l.success).length,
        byEventType: {} as Record<string, number>,
        deniedAccessAttempts: logs.filter(l => !l.success && l.action.includes('Denied')).length,
        adminActions: logs.filter(l => l.action.includes('[ADMIN]')).length
      };

      logs.forEach(log => {
        stats.byEventType[log.eventType] = (stats.byEventType[log.eventType] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error calculating audit stats:', error);
      return { error: 'Failed to calculate stats' };
    }
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();
