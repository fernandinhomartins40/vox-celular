import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'vox-dev-secret-change-in-production';
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || SECRET.length < 32)) {
  throw new Error('Production requires JWT_SECRET with at least 32 characters.');
}

export function signToken(payload: { userId: string; lojaId: string; role: string; tokenVersion?: number; sessionId?: string }) {
  return jwt.sign(payload, SECRET, { expiresIn: payload.sessionId ? '15m' : '7d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, SECRET) as { userId: string; lojaId: string; role: string; tokenVersion?: number; sessionId?: string };
}
