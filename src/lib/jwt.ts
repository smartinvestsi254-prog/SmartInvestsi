import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET_CURRENT || 'dev-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET_CURRENT || 'dev-refresh-secret';

export function signToken(payload: object, expiresIn = '24h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function signRefreshToken(payload: object) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET);
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}
