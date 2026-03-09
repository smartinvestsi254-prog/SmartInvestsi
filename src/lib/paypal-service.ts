/**
 * PayPal Payment Integration
 * Complete PayPal REST API integration for SmartInvest
 */

import axios from 'axios';

interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  mode: 'sandbox' | 'live';
  env: 'sandbox' | 'production';
  returnUrl: string;
  cancelUrl: string;
  receiverEmail: string;
}

interface PayPalOrder {
  id?: string;
  status?: string;
  links?: Array<{ rel: string; href: string }>;
  purchase_units?: Array<{
    amount: {
      currency_code: string;
      value: string;
    };
    payee?: {
      email_address: string;
    };
  }>;
}

interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  orderId?: string;
  status?: string;
  message: string;
  data?: any;
}

export class PayPalService {
  private config: PayPalConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  // Base URLs
  private readonly SANDBOX_BASE_URL = 'https://api-m.sandbox.paypal.com';
  private readonly LIVE_BASE_URL = 'https://api-m.paypal.com';

  constructor(config: PayPalConfig) {
    this.config = config;

    // Validate configuration
    if (!config.clientId || !config.clientSecret) {
      throw new Error('PayPal clientId and clientSecret are required');
    }
    if (!config.receiverEmail) {
      throw new Error('PayPal receiver email is required');
    }
  }

  /**
   * Get the API base URL based on environment
   */
  private getBaseUrl(): string {
    const isProduction = this.config.mode === 'live' || this.config.env === 'production';
    return isProduction ? this.LIVE_BASE_URL : this.SANDBOX_BASE_URL;
  }

  /**
   * Get API endpoints
   */
  private getEndpoint(path: string): string {
    return `${this.getBaseUrl()}${path}`;
  }

  /**
   * Get OAuth access token
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

      const response = await axios.post(
        this.getEndpoint('/v1/oauth2/token'),
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Token expires in 9000 seconds (9000 - 60 = 8940 for safety margin)
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;

      return this.accessToken;
    } catch (error) {
      console.error('✗ Failed to get PayPal access token:', error);
      throw new Error('Failed to authenticate with PayPal');
    }
  }

  /**
   * Create a PayPal order
   */
  async createOrder(
    amount: string,
    currency: string = 'USD',
    description: string = 'SmartInvest Investment'
  ): Promise<PaymentResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        this.getEndpoint('/v2/checkout/orders'),
        {
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: currency,
                value: amount,
              },
              description,
              payee: {
                email_address: this.config.receiverEmail,
              },
            },
          ],
          payment_source: {
            paypal: {
              experience_context: {
                return_url: this.config.returnUrl,
                cancel_url: this.config.cancelUrl,
                user_action: 'PAY_NOW',
                brand_name: 'SmartInvest',
              },
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
        }
      );

      const order = response.data as PayPalOrder;
      const approvalUrl = order.links?.find((link) => link.rel === 'approve')?.href;

      return {
        success: true,
        orderId: order.id,
        status: order.status,
        message: 'Order created successfully',
        data: {
          orderId: order.id,
          approvalUrl,
          redirectUrl: approvalUrl,
        },
      };
    } catch (error) {
      console.error('✗ PayPal createOrder failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create PayPal order',
      };
    }
  }

  /**
   * Capture PayPal order (complete payment)
   */
  async captureOrder(orderId: string): Promise<PaymentResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        this.getEndpoint(`/v2/checkout/orders/${orderId}/capture`),
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
        }
      );

      const data = response.data as PayPalOrder;

      return {
        success: true,
        orderId: data.id,
        status: data.status,
        transactionId: data.id,
        message: 'Payment captured successfully',
        data,
      };
    } catch (error) {
      console.error('✗ PayPal captureOrder failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to capture PayPal order',
      };
    }
  }

  /**
   * Get order details
   */
  async getOrderDetails(orderId: string): Promise<PaymentResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(this.getEndpoint(`/v2/checkout/orders/${orderId}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return {
        success: true,
        orderId: response.data.id,
        status: response.data.status,
        message: 'Order details retrieved',
        data: response.data,
      };
    } catch (error) {
      console.error('✗ PayPal getOrderDetails failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get order details',
      };
    }
  }

  /**
   * Refund a captured payment
   */
  async refundPayment(captureId: string, amount?: string): Promise<PaymentResponse> {
    try {
      const token = await this.getAccessToken();

      const payload: any = {};
      if (amount) {
        payload.amount = {
          currency_code: 'USD',
          value: amount,
        };
      }

      const response = await axios.post(
        this.getEndpoint(`/v2/payments/captures/${captureId}/refund`),
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
        }
      );

      return {
        success: true,
        transactionId: response.data.id,
        status: response.data.status,
        message: 'Refund processed successfully',
        data: response.data,
      };
    } catch (error) {
      console.error('✗ PayPal refund failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process refund',
      };
    }
  }

  /**
   * Verify a webhook event (security)
   */
  async verifyWebhookSignature(
    transmissionId: string,
    transmissionTime: string,
    certUrl: string,
    transmissionSig: string,
    webhookBody: string
  ): Promise<boolean> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        this.getEndpoint('/v1/notifications/verify-webhook-signature'),
        {
          transmission_id: transmissionId,
          transmission_time: transmissionTime,
          cert_url: certUrl,
          auth_algo: 'SHA256withRSA',
          transmission_sig: transmissionSig,
          webhook_body: webhookBody,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.verification_status === 'SUCCESS';
    } catch (error) {
      console.error('✗ Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Handle webhook event
   */
  async handleWebhookEvent(event: any): Promise<void> {
    const { event_type, resource } = event;

    switch (event_type) {
      case 'CHECKOUT.ORDER.COMPLETED':
        console.log('✓ Order completed:', resource.id);
        // Handle order completion
        break;
      case 'CHECKOUT.ORDER.EXPIRED':
        console.log('✓ Order expired:', resource.id);
        // Handle order expiration
        break;
      case 'PAYMENT.CAPTURE.COMPLETED':
        console.log('✓ Payment captured:', resource.id);
        // Handle payment capture
        break;
      case 'PAYMENT.CAPTURE.DECLINED':
        console.log('✓ Payment declined:', resource.id);
        // Handle payment decline
        break;
      case 'PAYMENT.CAPTURE.REFUNDED':
        console.log('✓ Payment refunded:', resource.id);
        // Handle refund
        break;
      default:
        console.log('Unknown event type:', event_type);
    }
  }
}

/**
 * Create and export a singleton instance
 */
let paypalService: PayPalService | null = null;

export function initializePayPalService(): PayPalService {
  const config: PayPalConfig = {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    mode: (process.env.PAYPAL_MODE as 'sandbox' | 'live') || 'sandbox',
    env: (process.env.PAYPAL_ENV as 'sandbox' | 'production') || 'sandbox',
    returnUrl: process.env.PAYPAL_RETURN_URL || 'https://yourdomain.com/paypal/return',
    cancelUrl: process.env.PAYPAL_CANCEL_URL || 'https://yourdomain.com/paypal/cancel',
    receiverEmail: process.env.PAYPAL_RECEIVER_EMAIL || 'delijah5415@gmail.com',
  };

  paypalService = new PayPalService(config);
  return paypalService;
}

export function getPayPalService(): PayPalService {
  if (!paypalService) {
    return initializePayPalService();
  }
  return paypalService;
}

export type { PayPalConfig, PayPalOrder, PaymentResponse };
