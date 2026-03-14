/**
 * User Authentication Functions for SmartInvestsi
 * Handles login, signup, and user management
 */

import logger from './logger';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'premium' | 'enterprise';
  plan: 'free' | 'premium' | 'enterprise';
  country?: string;
  createdAt: string;
  lastLogin?: string;
}

interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

// Mock user database - in production, this would connect to your backend API
const MOCK_USERS: User[] = [
  {
    id: '1',
    email: 'admin@smartinvestsi.com',
    name: 'Admin User',
    role: 'admin',
    plan: 'enterprise',
    country: 'US',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    email: 'user@example.com',
    name: 'Demo User',
    role: 'user',
    plan: 'free',
    country: 'US',
    createdAt: '2024-01-01T00:00:00Z'
  }
];

/**
 * Authenticate user login
 */
function authenticateUser(email: string, password: string): AuthResponse {
  // In production, this would validate against your backend
  const user = MOCK_USERS.find(u => u.email === email);

  if (!user) {
    logger.warn('Login attempt with non-existent email', { email });
    return { success: false, error: 'Invalid credentials' };
  }

  // Mock password validation - in production, use proper hashing
  if (password !== 'demo123' && email !== 'admin@smartinvestsi.com') {
    logger.warn('Login attempt with invalid password', { email });
    return { success: false, error: 'Invalid credentials' };
  }

  // Update last login
  user.lastLogin = new Date().toISOString();

  const token = generateToken(user);

  logger.info('User logged in successfully', { userId: user.id, email: user.email });

  return {
    success: true,
    user,
    token
  };
}

/**
 * Register new user
 */
function registerUser(email: string, name: string, password: string): AuthResponse {
  // Check if user already exists
  const existingUser = MOCK_USERS.find(u => u.email === email);
  if (existingUser) {
    logger.warn('Registration attempt with existing email', { email });
    return { success: false, error: 'User already exists' };
  }

  // Create new user
  const newUser: User = {
    id: Date.now().toString(),
    email,
    name,
    role: 'user',
    createdAt: new Date().toISOString()
  };

  MOCK_USERS.push(newUser);

  const token = generateToken(newUser);

  logger.info('New user registered', { userId: newUser.id, email: newUser.email });

  return {
    success: true,
    user: newUser,
    token
  };
}

/**
 * Generate JWT-like token (mock implementation)
 */
function generateToken(user: User): string {
  // In production, use proper JWT library
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Verify token
 */
function verifyToken(token: string): User | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());

    if (payload.exp < Date.now()) {
      return null; // Token expired
    }

    const user = MOCK_USERS.find(u => u.id === payload.userId);
    return user || null;
  } catch (error) {
    logger.error('Token verification failed', { error: error.message });
    return null;
  }
}

/**
 * Set a user's subscription plan and role.
 */
function setUserPlan(userId: string, plan: 'free' | 'premium' | 'enterprise'): AuthResponse {
  const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return { success: false, error: 'User not found' };
  }

  const role = plan === 'enterprise' ? 'enterprise' : plan === 'premium' ? 'premium' : 'user';

  MOCK_USERS[userIndex] = {
    ...MOCK_USERS[userIndex],
    plan,
    role
  };

  logger.info('User plan updated', { userId, plan });
  return { success: true, user: MOCK_USERS[userIndex] };
}

/**
 * Set a user's country (used for geolocation-based rules)
 */
function setUserCountry(userId: string, country: string): AuthResponse {
  const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return { success: false, error: 'User not found' };
  }

  MOCK_USERS[userIndex] = {
    ...MOCK_USERS[userIndex],
    country
  };

  logger.info('User country updated', { userId, country });
  return { success: true, user: MOCK_USERS[userIndex] };
}

/**
 * Get user profile
 */
function getUserProfile(userId: string): User | null {
  const user = MOCK_USERS.find(u => u.id === userId);
  return user || null;
}

/**
 * Update user profile
 */
function updateUserProfile(userId: string, updates: Partial<User>): AuthResponse {
  const userIndex = MOCK_USERS.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    return { success: false, error: 'User not found' };
  }

  MOCK_USERS[userIndex] = { ...MOCK_USERS[userIndex], ...updates };

  logger.info('User profile updated', { userId, updates: Object.keys(updates) });

  return {
    success: true,
    user: MOCK_USERS[userIndex]
  };
}

// Export for testing
export {
  authenticateUser,
  registerUser,
  verifyToken,
  getUserProfile,
  updateUserProfile,
  MOCK_USERS
};
