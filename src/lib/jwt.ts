import jwt, { Secret, SignOptions } from 'jsonwebtoken';

const JWT_SECRET: Secret = process.env.JWT_SECRET_CURRENT || 'dev-secret';
const JWT_REFRESH_SECRET: Secret = process.env.JWT_REFRESH_SECRET_CURRENT || 'dev-refresh-secret';

export function signToken(payload: string | Buffer | object, expiresIn: SignOptions['expiresIn'] = '24h'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function signRefreshToken(payload: string | Buffer | object): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET);
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}
