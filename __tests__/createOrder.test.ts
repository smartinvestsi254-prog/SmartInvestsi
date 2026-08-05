import { handler, createPayPalOrder, PLANS } from '../netlify/functions/createOrder';

// mock global fetch
const originalFetch = global.fetch as any;

describe('createOrder', () => {
  beforeAll(() => {
    global.fetch = jest.fn();
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('returns 400 when planId invalid', async () => {
    const event = { httpMethod: 'POST', body: JSON.stringify({ planId: 'BAD' }) } as any;
    const res = await handler(event as any, {} as any);
    expect(res.statusCode).toBe(400);
  });

  it('generates test order when TEST_MODE is true', async () => {
    // force TEST_MODE via env
    process.env.TEST_MODE = 'true';
    const order = await createPayPalOrder('PREM10', 'user123');
    expect(order.id).toMatch(/MOCK_ORDER_/);
  });

  it('calls PayPal API when not in test mode', async () => {
    process.env.TEST_MODE = 'false';
    const fakeToken = 'ABC';
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ access_token: fakeToken })
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ id: 'REAL', links: [{ rel: 'approve', href: 'http://ok' }] })
    });
    const order = await createPayPalOrder('PREM10', 'user123');
    expect(order.id).toBe('REAL');
  });
});
