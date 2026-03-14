import { handler } from '../netlify/functions/login';
import { authenticateUser } from '../netlify/functions/auth';

// mock logger
jest.mock('../netlify/functions/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('login', () => {
  it('returns 400 when email or password missing', async () => {
    const event = { httpMethod: 'POST', body: JSON.stringify({ email: 'test@example.com' }) } as any;
    const res = await handler(event, {} as any);
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 for invalid credentials', async () => {
    const event = { httpMethod: 'POST', body: JSON.stringify({ email: 'invalid@example.com', password: 'wrong' }) } as any;
    const res = await handler(event, {} as any);
    expect(res.statusCode).toBe(401);
  });

  it('returns 200 for valid admin credentials', async () => {
    const event = { httpMethod: 'POST', body: JSON.stringify({ email: 'admin@smartinvestsi.netlify.app', password: 'demo123' }) } as any;
    const res = await handler(event, {} as any);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.user.role).toBe('admin');
  });

  it('returns 405 for non-POST methods', async () => {
    const event = { httpMethod: 'GET' } as any;
    const res = await handler(event, {} as any);
    expect(res.statusCode).toBe(405);
  });
});