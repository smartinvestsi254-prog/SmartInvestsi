/**
 * Shared TypeScript interfaces for Netlify functions
 * Eliminates 'any' types across SmartInvest API
 */

export interface NetlifyEvent {
  httpMethod: string;
  path: string;
  body?: string;
  headers: Record<string, string>;
  pathParameters?: Record<string, string>;
}

export interface NetlifyContext {
  clientContext?: Record<string, unknown>; // Netlify-specific
}

export interface APIError {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface APIBodyResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type HTTPStatus = 200 | 201 | 400 | 401 | 403 | 404 | 405 | 409 | 500;

export interface SignupBody {
  email: string;
  name: string;
  password: string;
}

export interface SignupResult {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
}

export interface PortfolioBody {
  action: 'create' | 'update-holdings';
  name?: string;
  holdings?: Array<{
    symbol: string;
    quantity: number;
    price: number;
  }>;
}

export interface AdminActionBody {
  adminId: string;
  targetUserId: string;
  reason?: string;
}

export interface PaymentData {
  amount?: number;
  currency?: string;
  userId?: string;
  paymentMethodId?: string;
  orderId?: string;
  phoneNumber?: string;
}

export interface WebhookPayload {
  event_type?: string;
  resource?: {
    purchase_units?: Array<{
      custom_id?: string;
      amount?: {
        value?: string;
        currency_code?: string;
      };
    }>;
    payer?: {
      email_address?: string;
    };
    id?: string;
  };
}

export interface Headers {
  [key: string]: string | undefined;
  'paypal-transmission-signature'?: string;
  'paypal-cert-url'?: string;
  'paypal-transmission-id'?: string;
  'paypal-transmission-time'?: string;
}

// Common error handler
export function createErrorResponse(code: HTTPStatus, error: string): APIResponse {
  return {
    success: false,
    error
  };
}
