// ============================================================
// Shared event definitions (webhooks, internal events, audit)
// ============================================================

export type DomainEventType =
  | "user.registered"
  | "user.login"
  | "user.2fa_enabled"
  | "payment.created"
  | "payment.completed"
  | "payment.failed"
  | "payment.refunded"
  | "subscription.created"
  | "subscription.cancelled"
  | "subscription.renewed"
  | "kyc.submitted"
  | "kyc.approved"
  | "kyc.rejected"
  | "trade.order_placed"
  | "trade.order_filled"
  | "trade.position_liquidated"
  | "workflow.submitted"
  | "workflow.approved"
  | "workflow.rejected"
  | "incident.created"
  | "incident.resolved"
  | "license.granted"
  | "license.suspended"
  | "audit.log";

export interface DomainEvent<T = Record<string, unknown>> {
  id: string;
  type: DomainEventType;
  occurredAt: string;
  actorId?: string;
  actorEmail?: string;
  tenantId?: string;
  payload: T;
  requestId?: string;
}

// ---- Payment webhook events ----
export interface MpesaCallbackEvent {
  CheckoutRequestID: string;
  MerchantRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  Amount?: number;
  MpesaReceiptNumber?: string;
  PhoneNumber?: string;
  TransactionDate?: string;
}

export interface PaypalWebhookEvent {
  id: string;
  event_type: string;
  resource: Record<string, unknown>;
  create_time?: string;
}

// ---- Governance workflow events ----
export interface WorkflowTransitionEvent {
  workflowId: string;
  fromState: string;
  toState: string;
  actorId: string;
  reason?: string;
  meta?: Record<string, unknown>;
}

export interface IncidentLifecycleEvent {
  incidentId: string;
  fromStatus: string;
  toStatus: string;
  actorId: string;
  note?: string;
}

// ---- Audit ----
export interface AuditEvent extends DomainEvent {
  type: "audit.log";
  payload: {
    action: string;
    eventType: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    errorMessage?: string;
  };
}

