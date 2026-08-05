// @smartinvestsi/shared-types
// Shared TypeScript types used across SmartInvestsi and SmartGovern platforms

// ===========================================
// Common User Types
// ===========================================

export interface UserPayload {
  userId: string;
  email: string;
  admin?: boolean;
}

// ===========================================
// Common API Response Types
// ===========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

// ===========================================
// Common Error Types
// ===========================================

export interface AppError {
  statusCode: number;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// ===========================================
// Common Enums
// ===========================================

export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
}