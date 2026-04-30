import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'vox-dev-secret-change-in-production';

export function signToken(payload: { userId: string; lojaId: string; role: string }) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, SECRET) as { userId: string; lojaId: string; role: string };
}
