/**
 * SmartInvest Policy Compliance Module
 * Ensures all APIs follow website policies, security standards, and regulations
 */

import logger from './logger';

export interface ComplianceCheck {
  passed: boolean;
  violations: string[];
  recommendations: string[];
}

export interface UserContext {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country: string;
    region: string;
  };
  riskScore?: number;
}

/**
 * Rate limiting check
 */
export async function checkRateLimit(userId: string, endpoint: string, maxRequests = 100, windowMs = 15 * 60 * 1000): Promise<ComplianceCheck> {
  // Mock rate limiting - in production, use Redis or similar
  const violations: string[] = [];
  const recommendations: string[] = [];

  // Simulate rate limit check
  const requestCount = Math.floor(Math.random() * 120); // Mock request count

  if (requestCount > maxRequests) {
    violations.push(`Rate limit exceeded: ${requestCount}/${maxRequests} requests in ${windowMs/1000}s`);
    recommendations.push('Implement exponential backoff');
    recommendations.push('Consider upgrading to premium plan for higher limits');
  }

  return {
    passed: violations.length === 0,
    violations,
    recommendations
  };
}

/**
 * Authentication and authorization check
 */
export async function checkAuth(userContext: UserContext, requiredRole?: string): Promise<ComplianceCheck> {
  const violations: string[] = [];
  const recommendations: string[] = [];

  if (!userContext.userId || userContext.userId === 'anonymous') {
    violations.push('User not authenticated');
    recommendations.push('Require user authentication for this endpoint');
  }

  // Mock role check
  if (requiredRole) {
    const userRole = 'user'; // Mock - in production, get from database/JWT
    if (userRole !== requiredRole && userRole !== 'admin') {
      violations.push(`Insufficient permissions: requires ${requiredRole}, user has ${userRole}`);
      recommendations.push('Check user roles before processing request');
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    recommendations
  };
}

/**
 * Data privacy and GDPR compliance check
 */
export async function checkDataPrivacy(data: any, operation: string): Promise<ComplianceCheck> {
  const violations: string[] = [];
  const recommendations: string[] = [];

  // Check for PII in logs
  const sensitiveFields = ['password', 'ssn', 'creditCard', 'bankAccount'];
  const dataStr = JSON.stringify(data).toLowerCase();

  sensitiveFields.forEach(field => {
    if (dataStr.includes(field)) {
      violations.push(`Sensitive data (${field}) detected in ${operation}`);
      recommendations.push('Mask or exclude sensitive data from logs and responses');
      recommendations.push('Ensure data encryption at rest and in transit');
    }
  });

  // Check data retention
  if (operation === 'store' && !data.retentionPeriod) {
    recommendations.push('Specify data retention period for compliance');
  }

  return {
    passed: violations.length === 0,
    violations,
    recommendations
  };
}

/**
 * Geographic compliance check
 */
export async function checkGeographicCompliance(userContext: UserContext, service: string): Promise<ComplianceCheck> {
  const violations: string[] = [];
  const recommendations: string[] = [];

  if (!userContext.location) {
    recommendations.push('Collect user location for compliance checks');
    return { passed: true, violations, recommendations }; // Not a violation if location unknown
  }

  const { country } = userContext.location;

  // Service-specific geographic restrictions
  const restrictedServices: Record<string, string[]> = {
    'crypto-trading': ['US', 'CN'], // Restricted in some countries
    'banking-trial': [], // Available globally for trial
    'payments': [] // Payment restrictions handled separately
  };

  if (restrictedServices[service]?.includes(country)) {
    violations.push(`Service ${service} not available in ${country}`);
    recommendations.push('Display appropriate messaging for geographic restrictions');
  }

  // Enhanced due diligence for high-risk countries
  const highRiskCountries = ['KP', 'IR', 'CU']; // North Korea, Iran, Cuba
  if (highRiskCountries.includes(country)) {
    violations.push(`Enhanced due diligence required for users from ${country}`);
    recommendations.push('Implement additional KYC/AML checks');
  }

  return {
    passed: violations.length === 0,
    violations,
    recommendations
  };
}

/**
 * Fraud prevention check
 */
export async function checkFraudPrevention(userContext: UserContext, transactionData?: any): Promise<ComplianceCheck> {
  const violations: string[] = [];
  const recommendations: string[] = [];

  // Mock fraud scoring
  const fraudScore = userContext.riskScore || Math.random() * 100;

  if (fraudScore > 70) {
    violations.push(`High fraud risk detected (score: ${fraudScore})`);
    recommendations.push('Require additional verification');
    recommendations.push('Flag for manual review');
  }

  // Check for suspicious patterns
  if (transactionData) {
    const amount = transactionData.amount || 0;
    if (amount > 10000) { // Large transaction
      recommendations.push('Monitor large transactions for AML compliance');
    }

    // Velocity checks
    const transactionCount = 5; // Mock - transactions in last hour
    if (transactionCount > 10) {
      violations.push('High transaction velocity detected');
      recommendations.push('Implement velocity limits');
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    recommendations
  };
}

/**
 * Regulatory compliance check
 */
export async function checkRegulatoryCompliance(userContext: UserContext, service: string): Promise<ComplianceCheck> {
  const violations: string[] = [];
  const recommendations: string[] = [];

  // KYC/AML checks
  const kycStatus = 'verified'; // Mock - in production, check database
  if (kycStatus !== 'verified') {
    violations.push('KYC verification required');
    recommendations.push('Complete KYC process before allowing transactions');
  }

  // Service-specific regulations
  if (service === 'crypto-trading') {
    recommendations.push('Ensure compliance with local crypto regulations');
    recommendations.push('Report suspicious transactions to authorities');
  }

  if (service === 'payments') {
    recommendations.push('Comply with PCI DSS for payment processing');
    recommendations.push('Implement strong customer authentication');
  }

  return {
    passed: violations.length === 0,
    violations,
    recommendations
  };
}

/**
 * Comprehensive compliance check
 */
export async function runComplianceChecks(
  userContext: UserContext,
  service: string,
  operation: string,
  data?: any
): Promise<ComplianceCheck> {
  const allViolations: string[] = [];
  const allRecommendations: string[] = [];

  // Run all checks
  const checks = await Promise.all([
    checkRateLimit(userContext.userId, `${service}/${operation}`),
    checkAuth(userContext),
    checkDataPrivacy(data, operation),
    checkGeographicCompliance(userContext, service),
    checkFraudPrevention(userContext, data),
    checkRegulatoryCompliance(userContext, service)
  ]);

  checks.forEach(check => {
    allViolations.push(...check.violations);
    allRecommendations.push(...check.recommendations);
  });

  const passed = allViolations.length === 0;

  // Log compliance results
  if (!passed) {
    logger.warn('Compliance violations detected', {
      userId: userContext.userId,
      service,
      operation,
      violations: allViolations,
      recommendations: allRecommendations
    });
  }

  return {
    passed,
    violations: allViolations,
    recommendations: allRecommendations
  };
}

/**
 * Policy enforcement wrapper for API handlers
 */
export function withPolicyCompliance(
  handler: Function,
  service: string,
  requiredAuth = true,
  requiredRole?: string
) {
  return async (event: any) => {
    try {
      const data = event.body ? JSON.parse(event.body) : {};
      const userId = data.userId || event.headers?.['x-user-id'] || 'anonymous';

      const userContext: UserContext = {
        userId,
        ipAddress: event.headers?.['x-forwarded-for'] || event.headers?.['x-real-ip'],
        userAgent: event.headers?.['user-agent'],
        // Mock location - in production, use geolocation service
        location: { country: 'US', region: 'CA' },
        riskScore: Math.random() * 50 // Mock risk score
      };

      // Run compliance checks
      const compliance = await runComplianceChecks(userContext, service, event.httpMethod, data);

      if (!compliance.passed) {
        // For critical violations, block the request
        const criticalViolations = compliance.violations.filter(v =>
          v.includes('not authenticated') ||
          v.includes('insufficient permissions') ||
          v.includes('high fraud risk') ||
          v.includes('not available in')
        );

        if (criticalViolations.length > 0) {
          return {
            statusCode: 403,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: false,
              error: 'Request blocked due to policy violation',
              violations: criticalViolations,
              recommendations: compliance.recommendations
            })
          };
        }

        // For non-critical issues, log warnings but allow request
        logger.warn('Non-critical compliance issues', {
          userId,
          service,
          violations: compliance.violations
        });
      }

      // Proceed with original handler
      return await handler(event);
    } catch (error) {
      logger.error('Policy compliance wrapper error', { error: error.message, service });
      throw error;
    }
  };
}