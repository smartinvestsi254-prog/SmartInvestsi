// ============================================================
// Shared API contract DTOs
// ============================================================

import type {
  AuthTokens,
  KycStatus,
  OrderSide,
  OrderType,
  PaymentProvider,
  PaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from "./index";

// ---- Auth DTOs ----
export interface RegisterRequest {
  email: string;
  password: string;
  phone?: string;
  role?: string;
  fullName?: string;
  adminSecret?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    role: string;
    plan?: SubscriptionPlan;
  };
  tokens: AuthTokens;
}

// ---- Profile DTOs ----
export interface ProfileResponse {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  country?: string;
  kycStatus: KycStatus;
  plan: SubscriptionPlan;
}

// ---- Payments DTOs ----
export interface CreatePaymentRequest {
  amount: number;
  currency?: string;
  provider: PaymentProvider;
  description?: string;
  idempotencyKey?: string;
  phoneNumber?: string;
  planId?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  providerRef?: string;
  status: PaymentStatus;
  approvalUrl?: string;
}

// ---- Trading DTOs ----
export interface PlaceOrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  leverage?: number;
  exchange?: string;
}

export interface OrderResponse {
  success: boolean;
  order: {
    id: string;
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    filledQuantity: number;
    price?: number;
    status: string;
    leverage: number;
  };
}

// ---- Subscription DTOs ----
export interface SubscriptionResponse {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
}

