/**
 * Fraud Detection API for SmartInvest
 * Handles fraud detection, security monitoring, and risk assessment
 */

import { Handler } from '@netlify/functions';
import logger from './logger';

interface FraudAlert {
  id: string;
  userId: string;
  type: 'suspicious_login' | 'unusual_transaction' | 'ip_anomaly' | 'device_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: any;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  createdAt: string;
  resolvedAt?: string;
}

interface SecurityEvent {
  id: string;
  userId: string;
  eventType: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  riskScore: number;
  timestamp: string;
}

interface RiskAssessment {
  userId: string;
  overallRisk: 'low' | 'medium' | 'high';
  factors: {
    loginAnomalies: number;
    transactionVolume: number;
    geographicSpread: number;
    deviceChanges: number;
  };
  recommendations: string[];
  lastUpdated: string;
}

// Mock data - replace with real fraud detection system
const mockFraudAlerts: FraudAlert[] = [];
const mockSecurityEvents: SecurityEvent[] = [];
const mockRiskAssessments: { [userId: string]: RiskAssessment } = {};

/**
 * Detect fraud in transaction
 */
async function detectTransactionFraud(data: any): Promise<any> {
  try {
    const { userId, amount, merchant, location, deviceInfo } = data;

    // Simple fraud detection rules
    let riskScore = 0;
    const factors = [];

    // Check transaction amount
    if (amount > 10000) {
      riskScore += 30;
      factors.push('High transaction amount');
    }

    // Check location anomaly
    const userHistory = mockSecurityEvents.filter(e => e.userId === userId);
    const recentLocations = userHistory.slice(-5).map(e => e.location);
    if (location && !recentLocations.includes(location)) {
      riskScore += 25;
      factors.push('Unusual location');
    }

    // Check device change
    const recentDevices = userHistory.slice(-3).map(e => e.userAgent);
    if (deviceInfo && !recentDevices.some(d => d === deviceInfo)) {
      riskScore += 20;
      factors.push('New device detected');
    }

    // Check transaction frequency
    const recentTransactions = userHistory.filter(e => e.eventType === 'transaction').length;
    if (recentTransactions > 10) {
      riskScore += 15;
      factors.push('High transaction frequency');
    }

    const isFraudulent = riskScore > 50;

    if (isFraudulent) {
      const alert: FraudAlert = {
        id: `fraud_${Date.now()}`,
        userId,
        type: 'unusual_transaction',
        severity: riskScore > 75 ? 'high' : 'medium',
        description: `Suspicious transaction detected: ${factors.join(', ')}`,
        details: { amount, merchant, location, riskScore, factors },
        status: 'open',
        createdAt: new Date().toISOString()
      };

      mockFraudAlerts.push(alert);

      logger.warn('Fraud alert created', { alertId: alert.id, userId, riskScore });
    }

    // Log security event
    const event: SecurityEvent = {
      id: `event_${Date.now()}`,
      userId,
      eventType: 'transaction',
      ipAddress: data.ipAddress || 'unknown',
      userAgent: deviceInfo || 'unknown',
      location,
      riskScore,
      timestamp: new Date().toISOString()
    };

    mockSecurityEvents.push(event);

    return {
      success: true,
      data: {
        isFraudulent,
        riskScore,
        factors,
        alertId: isFraudulent ? mockFraudAlerts[mockFraudAlerts.length - 1].id : null
      }
    };
  } catch (error) {
    logger.error('Transaction fraud detection error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Detect login fraud
 */
async function detectLoginFraud(data: any): Promise<any> {
  try {
    const { userId, ipAddress, userAgent, location } = data;

    let riskScore = 0;
    const factors = [];

    // Check IP anomaly
    const userEvents = mockSecurityEvents.filter(e => e.userId === userId);
    const knownIPs = [...new Set(userEvents.map(e => e.ipAddress))];
    if (!knownIPs.includes(ipAddress)) {
      riskScore += 25;
      factors.push('Unknown IP address');
    }

    // Check location change
    const recentLocations = userEvents.slice(-3).map(e => e.location).filter(Boolean);
    if (location && !recentLocations.includes(location)) {
      riskScore += 20;
      factors.push('Unusual location');
    }

    // Check time-based anomalies
    const recentLogins = userEvents.filter(e => e.eventType === 'login');
    if (recentLogins.length > 0) {
      const lastLogin = new Date(recentLogins[recentLogins.length - 1].timestamp);
      const now = new Date();
      const hoursSinceLastLogin = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastLogin < 1) {
        riskScore += 15;
        factors.push('Rapid successive logins');
      }
    }

    const isSuspicious = riskScore > 30;

    if (isSuspicious) {
      const alert: FraudAlert = {
        id: `fraud_${Date.now()}`,
        userId,
        type: 'suspicious_login',
        severity: riskScore > 50 ? 'high' : 'medium',
        description: `Suspicious login detected: ${factors.join(', ')}`,
        details: { ipAddress, userAgent, location, riskScore, factors },
        status: 'open',
        createdAt: new Date().toISOString()
      };

      mockFraudAlerts.push(alert);

      logger.warn('Login fraud alert created', { alertId: alert.id, userId, riskScore });
    }

    // Log security event
    const event: SecurityEvent = {
      id: `event_${Date.now()}`,
      userId,
      eventType: 'login',
      ipAddress,
      userAgent,
      location,
      riskScore,
      timestamp: new Date().toISOString()
    };

    mockSecurityEvents.push(event);

    return {
      success: true,
      data: {
        isSuspicious,
        riskScore,
        factors,
        alertId: isSuspicious ? mockFraudAlerts[mockFraudAlerts.length - 1].id : null
      }
    };
  } catch (error) {
    logger.error('Login fraud detection error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get fraud alerts
 */
async function getFraudAlerts(userId?: string, status?: string): Promise<any> {
  try {
    let alerts = mockFraudAlerts;

    if (userId) {
      alerts = alerts.filter(a => a.userId === userId);
    }

    if (status) {
      alerts = alerts.filter(a => a.status === status);
    }

    return { success: true, data: alerts };
  } catch (error) {
    logger.error('Get fraud alerts error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Update fraud alert status
 */
async function updateFraudAlert(alertId: string, status: string, notes?: string): Promise<any> {
  try {
    const alert = mockFraudAlerts.find(a => a.id === alertId);
    if (!alert) {
      return { success: false, error: 'Alert not found' };
    }

    alert.status = status as any;
    if (status === 'resolved' || status === 'false_positive') {
      alert.resolvedAt = new Date().toISOString();
    }

    if (notes) {
      alert.details = { ...alert.details, resolutionNotes: notes };
    }

    logger.info('Fraud alert updated', { alertId, status, notes });

    return { success: true, data: alert };
  } catch (error) {
    logger.error('Update fraud alert error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get security events
 */
async function getSecurityEvents(userId?: string, limit = 100): Promise<any> {
  try {
    let events = mockSecurityEvents;

    if (userId) {
      events = events.filter(e => e.userId === userId);
    }

    events = events.slice(-limit);

    return { success: true, data: events };
  } catch (error) {
    logger.error('Get security events error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get risk assessment for user
 */
async function getRiskAssessment(userId: string): Promise<any> {
  try {
    let assessment = mockRiskAssessments[userId];

    if (!assessment) {
      // Generate new assessment
      const userEvents = mockSecurityEvents.filter(e => e.userId === userId);
      const userAlerts = mockFraudAlerts.filter(a => a.userId === userId && a.status === 'open');

      const avgRiskScore = userEvents.length > 0
        ? userEvents.reduce((sum, e) => sum + e.riskScore, 0) / userEvents.length
        : 0;

      let overallRisk: 'low' | 'medium' | 'high' = 'low';
      if (avgRiskScore > 50) overallRisk = 'high';
      else if (avgRiskScore > 25) overallRisk = 'medium';

      assessment = {
        userId,
        overallRisk,
        factors: {
          loginAnomalies: userAlerts.filter(a => a.type === 'suspicious_login').length,
          transactionVolume: userEvents.filter(e => e.eventType === 'transaction').length,
          geographicSpread: [...new Set(userEvents.map(e => e.location).filter(Boolean))].length,
          deviceChanges: [...new Set(userEvents.map(e => e.userAgent))].length
        },
        recommendations: generateRecommendations(overallRisk, userAlerts.length),
        lastUpdated: new Date().toISOString()
      };

      mockRiskAssessments[userId] = assessment;
    }

    return { success: true, data: assessment };
  } catch (error) {
    logger.error('Get risk assessment error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Generate risk recommendations
 */
function generateRecommendations(risk: string, alertCount: number): string[] {
  const recommendations = [];

  if (risk === 'high') {
    recommendations.push('Enable two-factor authentication');
    recommendations.push('Review recent account activity');
    recommendations.push('Contact support for account verification');
  } else if (risk === 'medium') {
    recommendations.push('Monitor account activity closely');
    recommendations.push('Update password regularly');
  }

  if (alertCount > 0) {
    recommendations.push('Review and resolve security alerts');
  }

  return recommendations;
}

/**
 * Report security incident
 */
async function reportSecurityIncident(data: any): Promise<any> {
  try {
    const { userId, incidentType, description, details } = data;

    const alert: FraudAlert = {
      id: `incident_${Date.now()}`,
      userId,
      type: 'security_incident',
      severity: 'high',
      description: `Security incident reported: ${description}`,
      details,
      status: 'investigating',
      createdAt: new Date().toISOString()
    };

    mockFraudAlerts.push(alert);

    logger.warn('Security incident reported', { alertId: alert.id, userId, incidentType });

    return { success: true, data: alert };
  } catch (error) {
    logger.error('Report security incident error', { error: error.message });
    return { success: false, error: error.message };
  }
}

export const handler: Handler = async (event) => {
  const { httpMethod, path, body } = event;

  try {
    if (!['GET', 'POST'].includes(httpMethod)) {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, error: 'Method not allowed' })
      };
    }

    const data = body ? JSON.parse(body) : {};
    const userId = data.userId || 'anonymous';

    let result;

    if (path.includes('/detect-transaction')) {
      result = await detectTransactionFraud(data);
    } else if (path.includes('/detect-login')) {
      result = await detectLoginFraud(data);
    } else if (path.includes('/alerts')) {
      result = await getFraudAlerts(data.userId, data.status);
    } else if (path.includes('/alerts/update/')) {
      const alertId = path.split('/update/')[1];
      result = await updateFraudAlert(alertId, data.status, data.notes);
    } else if (path.includes('/events')) {
      result = await getSecurityEvents(data.userId, data.limit);
    } else if (path.includes('/risk-assessment/')) {
      const targetUserId = path.split('/risk-assessment/')[1];
      result = await getRiskAssessment(targetUserId);
    } else if (path.includes('/report-incident')) {
      result = await reportSecurityIncident(data);
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, error: 'Endpoint not found' })
      };
    }

    return {
      statusCode: result.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    logger.error('Fraud API error', { error: error.message });

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};