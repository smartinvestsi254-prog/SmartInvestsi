/**
 * App Settings API for SmartInvest
 * Handles user preferences, notifications, security settings, and app configuration
 */

import { Handler } from '@netlify/functions';
import logger from './logger';

interface UserSettings {
  userId: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    marketing: boolean;
    security: boolean;
    priceAlerts: boolean;
    portfolioUpdates: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    dataSharing: boolean;
    analytics: boolean;
    thirdPartyIntegrations: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number; // minutes
    loginAlerts: boolean;
    deviceTracking: boolean;
    biometricEnabled: boolean;
  };
  trading: {
    defaultOrderType: 'market' | 'limit';
    autoStopLoss: boolean;
    maxOrderSize: number;
    riskLevel: 'conservative' | 'moderate' | 'aggressive';
    allowedAssets: string[];
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    currency: string;
    timezone: string;
    dateFormat: string;
  };
  academy: {
    learningReminders: boolean;
    progressNotifications: boolean;
    certificateAlerts: boolean;
    recommendedCourses: boolean;
  };
  updatedAt: string;
}

interface AppConfig {
  version: string;
  features: {
    cryptoTrading: boolean;
    premiumAcademy: boolean;
    advancedAnalytics: boolean;
    apiAccess: boolean;
  };
  limits: {
    free: {
      maxPortfolios: number;
      maxTransactions: number;
      apiCallsPerDay: number;
    };
    premium: {
      maxPortfolios: number;
      maxTransactions: number;
      apiCallsPerDay: number;
    };
    enterprise: {
      maxPortfolios: number;
      maxTransactions: number;
      apiCallsPerDay: number;
    };
  };
  supportedCurrencies: string[];
  supportedLanguages: string[];
}

// Mock data - replace with real database
const mockUserSettings: { [userId: string]: UserSettings } = {};

const defaultSettings: Omit<UserSettings, 'userId' | 'updatedAt'> = {
  notifications: {
    email: true,
    push: true,
    sms: false,
    marketing: false,
    security: true,
    priceAlerts: true,
    portfolioUpdates: true
  },
  privacy: {
    profileVisibility: 'private',
    dataSharing: false,
    analytics: true,
    thirdPartyIntegrations: false
  },
  security: {
    twoFactorEnabled: false,
    sessionTimeout: 30,
    loginAlerts: true,
    deviceTracking: true,
    biometricEnabled: false
  },
  trading: {
    defaultOrderType: 'market',
    autoStopLoss: false,
    maxOrderSize: 10000,
    riskLevel: 'moderate',
    allowedAssets: ['stocks', 'crypto', 'etf']
  },
  display: {
    theme: 'auto',
    language: 'en',
    currency: 'USD',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY'
  },
  academy: {
    learningReminders: true,
    progressNotifications: true,
    certificateAlerts: true,
    recommendedCourses: true
  }
};

const appConfig: AppConfig = {
  version: '2.1.0',
  features: {
    cryptoTrading: true,
    premiumAcademy: true,
    advancedAnalytics: true,
    apiAccess: true
  },
  limits: {
    free: {
      maxPortfolios: 3,
      maxTransactions: 50,
      apiCallsPerDay: 1000
    },
    premium: {
      maxPortfolios: 10,
      maxTransactions: 500,
      apiCallsPerDay: 10000
    },
    enterprise: {
      maxPortfolios: 50,
      maxTransactions: 5000,
      apiCallsPerDay: 100000
    }
  },
  supportedCurrencies: ['USD', 'EUR', 'GBP', 'KES', 'CAD', 'AUD'],
  supportedLanguages: ['en', 'es', 'fr', 'de', 'sw', 'pt']
};

/**
 * Get user settings
 */
async function getUserSettings(userId: string): Promise<any> {
  try {
    let settings = mockUserSettings[userId];

    if (!settings) {
      // Create default settings
      settings = {
        userId,
        ...defaultSettings,
        updatedAt: new Date().toISOString()
      };
      mockUserSettings[userId] = settings;
    }

    return { success: true, data: settings };
  } catch (error) {
    logger.error('Get user settings error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Update user settings
 */
async function updateUserSettings(data: any): Promise<any> {
  try {
    const { userId, settings } = data;

    let userSettings = mockUserSettings[userId];

    if (!userSettings) {
      userSettings = {
        userId,
        ...defaultSettings,
        updatedAt: new Date().toISOString()
      };
    }

    // Merge new settings
    Object.keys(settings).forEach(category => {
      if (userSettings[category]) {
        Object.assign(userSettings[category], settings[category]);
      }
    });

    userSettings.updatedAt = new Date().toISOString();
    mockUserSettings[userId] = userSettings;

    logger.info('User settings updated', { userId, categories: Object.keys(settings) });

    return { success: true, data: userSettings };
  } catch (error) {
    logger.error('Update user settings error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Reset settings to defaults
 */
async function resetSettings(userId: string): Promise<any> {
  try {
    const settings: UserSettings = {
      userId,
      ...defaultSettings,
      updatedAt: new Date().toISOString()
    };

    mockUserSettings[userId] = settings;

    logger.info('Settings reset to defaults', { userId });

    return { success: true, data: settings };
  } catch (error) {
    logger.error('Reset settings error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get app configuration
 */
async function getAppConfig(): Promise<any> {
  try {
    return { success: true, data: appConfig };
  } catch (error) {
    logger.error('Get app config error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Update notification preferences
 */
async function updateNotifications(data: any): Promise<any> {
  try {
    const { userId, notifications } = data;

    const settings = await getUserSettings(userId);
    if (!settings.success) return settings;

    Object.assign(settings.data.notifications, notifications);
    settings.data.updatedAt = new Date().toISOString();

    mockUserSettings[userId] = settings.data;

    return { success: true, data: settings.data.notifications };
  } catch (error) {
    logger.error('Update notifications error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Update security settings
 */
async function updateSecuritySettings(data: any): Promise<any> {
  try {
    const { userId, security } = data;

    const settings = await getUserSettings(userId);
    if (!settings.success) return settings;

    Object.assign(settings.data.security, security);
    settings.data.updatedAt = new Date().toISOString();

    mockUserSettings[userId] = settings.data;

    logger.info('Security settings updated', { userId, changes: Object.keys(security) });

    return { success: true, data: settings.data.security };
  } catch (error) {
    logger.error('Update security settings error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Update trading preferences
 */
async function updateTradingSettings(data: any): Promise<any> {
  try {
    const { userId, trading } = data;

    const settings = await getUserSettings(userId);
    if (!settings.success) return settings;

    Object.assign(settings.data.trading, trading);
    settings.data.updatedAt = new Date().toISOString();

    mockUserSettings[userId] = settings.data;

    return { success: true, data: settings.data.trading };
  } catch (error) {
    logger.error('Update trading settings error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Update display preferences
 */
async function updateDisplaySettings(data: any): Promise<any> {
  try {
    const { userId, display } = data;

    const settings = await getUserSettings(userId);
    if (!settings.success) return settings;

    Object.assign(settings.data.display, display);
    settings.data.updatedAt = new Date().toISOString();

    mockUserSettings[userId] = settings.data;

    return { success: true, data: settings.data.display };
  } catch (error) {
    logger.error('Update display settings error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Export user data
 */
async function exportUserData(userId: string): Promise<any> {
  try {
    const settings = await getUserSettings(userId);
    if (!settings.success) return settings;

    // In production, gather all user data
    const exportData = {
      settings: settings.data,
      exportDate: new Date().toISOString(),
      version: appConfig.version
    };

    return { success: true, data: exportData };
  } catch (error) {
    logger.error('Export user data error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Delete user account (GDPR compliance)
 */
async function deleteUserAccount(userId: string): Promise<any> {
  try {
    // In production, implement proper account deletion
    delete mockUserSettings[userId];

    logger.warn('User account deletion requested', { userId });

    return {
      success: true,
      data: {
        message: 'Account deletion initiated. All data will be permanently removed within 30 days.',
        deletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    };
  } catch (error) {
    logger.error('Delete user account error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get user limits based on plan
 */
async function getUserLimits(userId: string): Promise<any> {
  try {
    // In production, get user's plan from subscription
    const userPlan = 'premium'; // Mock

    const limits = appConfig.limits[userPlan] || appConfig.limits.free;

    return { success: true, data: { plan: userPlan, limits } };
  } catch (error) {
    logger.error('Get user limits error', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Validate settings update
 */
function validateSettings(category: string, settings: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (category) {
    case 'notifications':
      if (typeof settings.email !== 'boolean') errors.push('Email preference must be boolean');
      if (typeof settings.push !== 'boolean') errors.push('Push preference must be boolean');
      break;

    case 'security':
      if (settings.sessionTimeout && (settings.sessionTimeout < 5 || settings.sessionTimeout > 480)) {
        errors.push('Session timeout must be between 5 and 480 minutes');
      }
      break;

    case 'trading':
      if (settings.maxOrderSize && settings.maxOrderSize < 0) {
        errors.push('Max order size cannot be negative');
      }
      if (settings.riskLevel && !['conservative', 'moderate', 'aggressive'].includes(settings.riskLevel)) {
        errors.push('Invalid risk level');
      }
      break;

    case 'display':
      if (settings.theme && !['light', 'dark', 'auto'].includes(settings.theme)) {
        errors.push('Invalid theme');
      }
      if (settings.language && !appConfig.supportedLanguages.includes(settings.language)) {
        errors.push('Unsupported language');
      }
      if (settings.currency && !appConfig.supportedCurrencies.includes(settings.currency)) {
        errors.push('Unsupported currency');
      }
      break;
  }

  return { valid: errors.length === 0, errors };
}

export const handler: Handler = async (event) => {
  const { httpMethod, path, body } = event;

  try {
    if (!['GET', 'POST', 'DELETE'].includes(httpMethod)) {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, error: 'Method not allowed' })
      };
    }

    const data = body ? JSON.parse(body) : {};
    const userId = data.userId || 'anonymous';

    let result;

    if (path.includes('/settings') && httpMethod === 'GET') {
      result = await getUserSettings(userId);
    } else if (path.includes('/settings') && httpMethod === 'POST') {
      result = await updateUserSettings(data);
    } else if (path.includes('/settings/reset')) {
      result = await resetSettings(userId);
    } else if (path.includes('/config')) {
      result = await getAppConfig();
    } else if (path.includes('/notifications')) {
      result = await updateNotifications(data);
    } else if (path.includes('/security')) {
      result = await updateSecuritySettings(data);
    } else if (path.includes('/trading')) {
      result = await updateTradingSettings(data);
    } else if (path.includes('/display')) {
      result = await updateDisplaySettings(data);
    } else if (path.includes('/export')) {
      result = await exportUserData(userId);
    } else if (path.includes('/delete') && httpMethod === 'DELETE') {
      result = await deleteUserAccount(userId);
    } else if (path.includes('/limits')) {
      result = await getUserLimits(userId);
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
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    logger.error('App Settings API error', { error: error.message });

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};