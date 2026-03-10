import { handler, handlePaymentCompleted, handlePaymentDenied, subscriptions } from '../netlify/functions/paypalWebhook';

describe('paypalWebhook', () => {
  beforeEach(() => {
    subscriptions.clear();
  });

  it('returns 405 for non-POST', async () => {
    const event = { httpMethod: 'GET' } as any;
    const res = await handler(event, {} as any);
    expect(res.statusCode).toBe(405);
  });

  it('handles PAYMENT.CAPTURE.COMPLETED', async () => {
    const payment = {
      id: 'PAY123',
      purchase_units: [{
        custom_id: 'PREM10_user123',
        amount: { value: '10.00', currency_code: 'USD' }
      }],
      payer: { email_address: 'user@example.com' }
    };
    const event = { httpMethod: 'POST', body: JSON.stringify({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: payment }) } as any;
    const res = await handler(event, {} as any);
    expect(res.statusCode).toBe(200);
    expect(subscriptions.get('PREM10_user123')?.status).toBe('active');
  });

  it('handles PAYMENT.CAPTURE.DENIED', async () => {
    const payment = {
      id: 'PAY456',
      purchase_units: [{ custom_id: 'PREM10_user123' }]
    };
    const event = { httpMethod: 'POST', body: JSON.stringify({ event_type: 'PAYMENT.CAPTURE.DENIED', resource: payment }) } as any;
    const res = await handler(event, {} as any);
    expect(res.statusCode).toBe(200);
    expect(subscriptions.get('PREM10_user123')?.status).toBe('denied');
  });

  it('handles unknown event type', async () => {
    const event = { httpMethod: 'POST', body: JSON.stringify({ event_type: 'UNKNOWN' }) } as any;
    const res = await handler(event, {} as any);
    expect(res.statusCode).toBe(200);
  });
});
