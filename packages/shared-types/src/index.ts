// ============================================================
// SmartInvestsi & SmartGovern — Shared TypeScript Types
// ============================================================

// ------------------------------------------------------------
// Common
// ------------------------------------------------------------
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp?: string;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

// ------------------------------------------------------------
// SmartInvestsi — Subscriptions
// ------------------------------------------------------------
export type SubscriptionPlan = "BASIC" | "PREMIUM" | "ENTERPRISE";

export type SubscriptionStatus =
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELLED"
  | "EXPIRED"
  | "TRIAL"
  | "PENDING";

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  premiumAccess: boolean;
  plan: SubscriptionPlan;
  kycStatus?: KycStatus;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  planId: string;
  planName: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
}

// ------------------------------------------------------------
// SmartInvestsi — Portfolio & Trading
// ------------------------------------------------------------
export interface PortfolioSnapshot {
  id: string;
  userId: string;
  totalValue: number;
  currency: string;
  updatedAt: string;
}

export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT" | "STOP_LOSS" | "TAKE_PROFIT" | "STOP_LIMIT";
export type OrderStatus =
  | "PENDING"
  | "OPEN"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCELLED"
  | "REJECTED"
  | "EXPIRED";

export interface TradeOrder {
  id: string;
  userId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  filledQuantity: number;
  price?: number;
  stopPrice?: number;
  status: OrderStatus;
  leverage: number;
}

export interface Position {
  id: string;
  userId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  leverage: number;
  unrealizedPnl: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  status: "OPEN" | "CLOSED" | "LIQUIDATED";
}

// ------------------------------------------------------------
// SmartInvestsi — Payments
// ------------------------------------------------------------
export type PaymentProvider = "MPESA" | "PAYPAL" | "STRIPE";
export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "DISPUTED";

export interface PaymentTransaction {
  id: string;
  userId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  providerRef?: string;
  type: "SUBSCRIPTION" | "DEPOSIT" | "WITHDRAWAL" | "RENEWAL" | "REFUND";
  createdAt: string;
}

// ------------------------------------------------------------
// SmartInvestsi — KYC
// ------------------------------------------------------------
export type KycStatus =
  | "NOT_SUBMITTED"
  | "PENDING"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_MORE_INFO";

export type KycDocumentType =
  | "NATIONAL_ID"
  | "PASSPORT"
  | "SELFIE"
  | "ADDRESS_PROOF"
  | "DRIVERS_LICENSE";

export interface KycSubmission {
  id: string;
  userId: string;
  documentType: KycDocumentType;
  status: KycStatus;
  createdAt: string;
}

// ------------------------------------------------------------
// SmartInvestsi — Wallet
// ------------------------------------------------------------
export interface Wallet {
  id: string;
  userId: string;
  currency: string;
  balance: number;
  availableBalance: number;
  heldBalance: number;
}

// ------------------------------------------------------------
// SmartGovern — Governance
// ------------------------------------------------------------
export interface WorkflowRecord {
  id: string;
  title: string;
  status: "DRAFT" | "IN_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "PUBLISHED" | "ARCHIVED" | "REJECTED";
  ownerId: string;
  type?: string;
}

export interface IncidentRecord {
  id: string;
  title: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "INVESTIGATING" | "MITIGATING" | "RESOLVED" | "CLOSED";
  reportedById: string;
  ownerId?: string;
}

export interface DataLicenseRecord {
  id: string;
  partnerId: string;
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED" | "PENDING" | "REVOKED";
  allowedPurposes: string[];
  attributionRequired: boolean;
  rateLimitPerMin?: number;
}

export interface TreatyRecord {
  id: string;
  title: string;
  partner: string;
  sector: string;
  status: "NEGOTIATION" | "SIGNED" | "RATIFIED" | "IN_REVIEW" | "IMPLEMENTATION" | "EXPIRED";
}

export interface DelegationRecord {
  id: string;
  name: string;
  focus: string;
  hostCity: string;
  hostCountry: string;
  leadMinistry: string;
  status: "PLANNED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  startDate: string;
  endDate: string;
}

export interface ComplianceRecord {
  id: string;
  entityType: string;
  entityId: string;
  regulation: string;
  status: "COMPLIANT" | "NON_COMPLIANT" | "PENDING" | "WAIVER" | "UNDER_REVIEW";
}

// ------------------------------------------------------------
// Security / Audit
// ------------------------------------------------------------
export interface AuditLogEntry {
  id: string;
  userId?: string;
  userEmail?: string;
  eventType: string;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  success: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
