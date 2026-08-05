import { handler } from '../netlify/functions/signup';
import { registerUser } from '../netlify/functions/auth';

// mock logger
jest.mock('../netlify/functions/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('signup', () => {
  it('returns 400 when required fields missing', async () => {
    const event = { httpMethod: 'POST', body: JSON.stringify({ email: 'test@example.com' }) } as any;
    const res = await handler(event, {} as any);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for weak password', async () => {
    const event = { httpMethod: 'POST', body: JSON.stringify({ email: 'test@example.com', name: 'Test', password: '123' }) } as any;
    const res = await handler(event, {} as any);
    expect(res.statusCode).toBe(400);
  });

  it('returns 409 for existing user', async () => {
    const event = { httpMethod: 'POST', body: JSON.stringify({ email: 'user@example.com', name: 'Test', password: 'password123' }) } as any;
    const res = await handler(event, {} as any);
    expect(res.statusCode).toBe(409);
  });

  it('returns 201 for successful registration', async () => {
    const event = { httpMethod: 'POST', body: JSON.stringify({ email: 'newuser@example.com', name: 'New User', password: 'password123' }) } as any;
    const res = await handler(event, {} as any);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.user.email).toBe('newuser@example.com');
  });

  it('returns 405 for non-POST methods', async () => {
    const event = { httpMethod: 'GET' } as any;
    const res = await handler(event, {} as any);
    expect(res.statusCode).toBe(405);
  });
});