/**
 * Geolocation API for SmartInvest
 * Handles IP geolocation, country detection, and deposit restrictions
 */

import { Handler } from '@netlify/functions';
import logger from './logger';

interface GeoLocation {
  ip: string;
  country: string;
  countryCode: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
}

interface DepositRule {
  countryCode: string;
  allowedBanks: string[];
  maxDepositAmount: number;
  currency: string;
  restrictions: string[];
  lastUpdated: string;
}

interface UserLocation {
  userId: string;
  currentLocation: GeoLocation;
  allowedCountries: string[];
  depositRestrictions: DepositRule[];
  lastVerified: string;
}

// Mock data - replace with real geolocation service
const mockGeoData: { [ip: string]: GeoLocation } = {
  '192.168.1.1': {
    ip: '192.168.1.1',
    country: 'United States',
    countryCode: 'US',
    city: 'New York',
    region: 'NY',
    latitude: 40.7128,
    longitude: -74.0060,
    timezone: 'America/New_York',
    isp: 'Verizon'
  },
  '41.203.78.1': {
    ip: '41.203.78.1',
    country: 'Kenya',
    countryCode: 'KE',
    city: 'Nairobi',
    region: 'Nairobi',
    latitude: -1.2864,
    longitude: 36.8172,
    timezone: 'UTC',
    isp: 'Safaricom'
  }
};

const mockDepositRules: { [countryCode: string]: DepositRule } = {
  'US': {
    countryCode: 'US',
    allowedBanks: ['Chase', 'Bank of America', 'Wells Fargo', 'Citibank'],
    maxDepositAmount: 10000,
    currency: 'USD',
    restrictions: ['Must be US citizen', 'Bank account required'],
    lastUpdated: '2024-01-01T00:00:00Z'
  },
  'KE': {
    countryCode: 'KE',
    allowedBanks: ['KCB', 'Equity Bank', 'Cooperative Bank', 'Absa'],
    maxDepositAmount: 500000,
    currency: 'KES',
    restrictions: ['Must have Kenyan ID', 'Local bank account required'],
    lastUpdated: '2024-01-01T00:00:00Z'
  }
};

/**
 * Get geolocation for IP address
 */
async function getGeolocation(ipAddress: string): Promise<any> {
  try {
    // In production, use a geolocation service like MaxMind or IP-API
    let location = mockGeoData[ipAddress];

    if (!location) {
      // Fallback to a default location or external API
      location = {
        ip: ipAddress,
        country: 'Unknown',
        countryCode: 'XX',
        city: 'Unknown',
        latitude: 0,
        longitude: 0
      };
    }

    return { success: true, data: location };
  } catch (error) {
    logger.error('Geolocation lookup error', { error: error.message, ipAddress });
    return { success: false, error: error.message };
  }
}

/**
 * Validate deposit location
 */
async function validateDepositLocation(data: any): Promise<any> {
  try {
    const { userId, ipAddress, bankName, depositAmount } = data;

    // Get user location
    const geoResult = await getGeolocation(ipAddress);
    if (!geoResult.success) {
      return geoResult;
    }

    const location = geoResult.data;
    const countryCode = location.countryCode;

    // Check if country is allowed
    const allowedCountries = ['US', 'KE', 'GB', 'CA']; // Example allowed countries
    if (!allowedCountries.includes(countryCode)) {
      return {
        success: false,
        error: `Deposits not allowed from ${location.country}`,
        data: { location, allowed: false, reason: 'country_not_allowed' }
      };
    }

    // Get deposit rules for country
    const rules = mockDepositRules[countryCode];
    if (!rules) {
      return {
        success: false,
        error: 'Deposit rules not configured for this country',
        data: { location, allowed: false, reason: 'no_rules_configured' }
      };
    }

    // Check bank restrictions
    if (!rules.allowedBanks.includes(bankName)) {
      return {
        success: false,
        error: `Bank ${bankName} is not allowed for deposits from ${location.country}`,
        data: { location, rules, allowed: false, reason: 'bank_not_allowed' }
      };
    }

    // Check amount limits
    if (depositAmount > rules.maxDepositAmount) {
      return {
        success: false,
        error: `Deposit amount exceeds maximum limit of ${rules.maxDepositAmount} ${rules.currency}`,
        data: { location, rules, allowed: false, reason: 'amount_exceeds_limit' }
      };
    }

    // Check additional restrictions
    for (const restriction of rules.restrictions) {
      // In production, validate each restriction
      logger.info('Validating restriction', { restriction, userId });
    }

    logger.info('Deposit location validated', { userId, countryCode, bankName, depositAmount });

    return {
      success: true,
      data: {
        location,
        rules,
        allowed: true,
        validationPassed: true
      }
    };
  } catch (error) {
    logger.error('Deposit location validation error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get deposit rules for country
 */
async function getDepositRules(countryCode: string): Promise<any> {
  try {
    const rules = mockDepositRules[countryCode];

    if (!rules) {
      return { success: false, error: 'Deposit rules not found for this country' };
    }

    return { success: true, data: rules };
  } catch (error) {
    logger.error('Get deposit rules error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Update user location tracking
 */
async function updateUserLocation(data: any): Promise<any> {
  try {
    const { userId, ipAddress } = data;

    const geoResult = await getGeolocation(ipAddress);
    if (!geoResult.success) {
      return geoResult;
    }

    const location = geoResult.data;

    // In production, store user location history
    const userLocation: UserLocation = {
      userId,
      currentLocation: location,
      allowedCountries: ['US', 'KE', 'GB', 'CA'],
      depositRestrictions: [mockDepositRules[location.countryCode]].filter(Boolean),
      lastVerified: new Date().toISOString()
    };

    logger.info('User location updated', { userId, countryCode: location.countryCode });

    return { success: true, data: userLocation };
  } catch (error) {
    logger.error('Update user location error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Check if IP is from allowed country
 */
async function checkAllowedCountry(ipAddress: string): Promise<any> {
  try {
    const geoResult = await getGeolocation(ipAddress);
    if (!geoResult.success) {
      return geoResult;
    }

    const location = geoResult.data;
    const allowedCountries = ['US', 'KE', 'GB', 'CA', 'AU', 'DE'];

    const isAllowed = allowedCountries.includes(location.countryCode);

    return {
      success: true,
      data: {
        location,
        allowed: isAllowed,
        reason: isAllowed ? null : 'country_not_supported'
      }
    };
  } catch (error) {
    logger.error('Check allowed country error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get supported countries
 */
async function getSupportedCountries(): Promise<any> {
  try {
    const countries = [
      { code: 'US', name: 'United States', currency: 'USD' },
      { code: 'KE', name: 'Kenya', currency: 'KES' },
      { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
      { code: 'CA', name: 'Canada', currency: 'CAD' },
      { code: 'AU', name: 'Australia', currency: 'AUD' },
      { code: 'DE', name: 'Germany', currency: 'EUR' }
    ];

    return { success: true, data: countries };
  } catch (error) {
    logger.error('Get supported countries error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Validate transaction location
 */
async function validateTransactionLocation(data: any): Promise<any> {
  try {
    const { userId, ipAddress, recipientId, amount } = data;

    // For app-internal transactions, allow any location
    // Only restrict external transfers
    const isInternalTransfer = recipientId && recipientId.startsWith('user_');

    if (isInternalTransfer) {
      return {
        success: true,
        data: {
          allowed: true,
          type: 'internal',
          message: 'Internal transfers are always allowed'
        }
      };
    }

    // For external transfers, apply strict location checks
    const geoResult = await getGeolocation(ipAddress);
    if (!geoResult.success) {
      return geoResult;
    }

    const location = geoResult.data;

    // Only allow external transfers from user's registered country
    // In production, check against user's profile country
    const userCountry = 'US'; // Mock - get from user profile

    if (location.countryCode !== userCountry) {
      return {
        success: false,
        error: 'External transfers only allowed from your registered country',
        data: {
          location,
          allowed: false,
          reason: 'external_transfer_restricted'
        }
      };
    }

    return {
      success: true,
      data: {
        location,
        allowed: true,
        type: 'external',
        restrictions: ['Amount limits apply', 'Additional verification required']
      }
    };
  } catch (error) {
    logger.error('Validate transaction location error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get location-based recommendations
 */
async function getLocationRecommendations(ipAddress: string): Promise<any> {
  try {
    const geoResult = await getGeolocation(ipAddress);
    if (!geoResult.success) {
      return geoResult;
    }

    const location = geoResult.data;
    const recommendations = [];

    // Country-specific recommendations
    if (location.countryCode === 'KE') {
      recommendations.push('Use M-Pesa for faster deposits');
      recommendations.push('Local bank transfers are preferred');
    } else if (location.countryCode === 'US') {
      recommendations.push('ACH transfers are recommended for large amounts');
      recommendations.push('Wire transfers available for premium users');
    }

    // Currency recommendations
    const rules = mockDepositRules[location.countryCode];
    if (rules) {
      recommendations.push(`Deposit in ${rules.currency} to avoid conversion fees`);
    }

    return {
      success: true,
      data: {
        location,
        recommendations,
        supportedBanks: rules?.allowedBanks || []
      }
    };
  } catch (error) {
    logger.error('Get location recommendations error', { error: error.message });
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

    let result;

    if (path.includes('/geolocate/')) {
      const ipAddress = path.split('/geolocate/')[1] || data.ipAddress;
      result = await getGeolocation(ipAddress);
    } else if (path.includes('/validate-deposit')) {
      result = await validateDepositLocation(data);
    } else if (path.includes('/deposit-rules/')) {
      const countryCode = path.split('/deposit-rules/')[1];
      result = await getDepositRules(countryCode);
    } else if (path.includes('/update-location')) {
      result = await updateUserLocation(data);
    } else if (path.includes('/check-country/')) {
      const ipAddress = path.split('/check-country/')[1] || data.ipAddress;
      result = await checkAllowedCountry(ipAddress);
    } else if (path.includes('/supported-countries')) {
      result = await getSupportedCountries();
    } else if (path.includes('/validate-transaction')) {
      result = await validateTransactionLocation(data);
    } else if (path.includes('/recommendations/')) {
      const ipAddress = path.split('/recommendations/')[1] || data.ipAddress;
      result = await getLocationRecommendations(ipAddress);
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
    logger.error('Geo API error', { error: error.message });

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};