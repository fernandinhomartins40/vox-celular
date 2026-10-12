import { createHash, randomBytes } from 'node:crypto';
import { Request, Response } from 'express';
import { prisma } from './prisma.js';
import { signToken } from './jwt.js';

export const hashRefresh = (value: string) => createHash('sha256').update(value).digest('hex');
export const refreshValue = () => randomBytes(32).toString('base64url');
export function webOrigin(req: Request) {
  return req.get('origin') === (process.env.CORS_ORIGIN || 'http://localhost:3000');
}
export function refreshCookie(res: Response, value: string) {
  res.cookie('vox_refresh', value, { httpOnly: true, secure: (process.env.CORS_ORIGIN || '').startsWith('https://'), sameSite: 'strict', path: '/api/auth', maxAge: value ? 28 * 86400000 : 0 });
}
export function readRefresh(req: Request): string | undefined {
  const match = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith('vox_refresh='));
  return match?.slice('vox_refresh='.length);
}
type SessionUser = { id: string; lojaId: string; role: string; tokenVersion: number; nome: string; email: string };
export function sessionResponse(user: SessionUser, id: string) {
  return { token: signToken({ userId: user.id, lojaId: user.lojaId, role: user.role, tokenVersion: user.tokenVersion, sessionId: id }), user: { id: user.id, nome: user.nome, email: user.email, role: user.role, lojaId: user.lojaId } };
}
export async function createSession(user: SessionUser, req: Request, res: Response) {
  const refreshToken = refreshValue();
  const row = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
    await tx.sessao.deleteMany({ where: { usuarioId: user.id, expiresAt: { lte: new Date() } } });
    const old = await tx.sessao.findMany({ where: { usuarioId: user.id }, orderBy: { createdAt: 'desc' }, skip: 9, select: { id: true } });
    if (old.length) await tx.sessao.deleteMany({ where: { id: { in: old.map(item => item.id) } } });
    return tx.sessao.create({ data: { usuarioId: user.id, token: hashRefresh(refreshToken), tokenVersion: user.tokenVersion, expiresAt: new Date(Date.now() + 28 * 86400000) } });
  });
  if (req.body.plataforma === 'web') { refreshCookie(res, refreshToken); return sessionResponse(user, row.id); }
  return { ...sessionResponse(user, row.id), refreshToken };
}
