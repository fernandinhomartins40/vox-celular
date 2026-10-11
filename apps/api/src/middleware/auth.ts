import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

export interface AuthRequest extends Request {
  user?: { userId: string; lojaId: string; role: string };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }
  try {
    const claims = verifyToken(header.slice(7));
    const user = await prisma.usuario.findFirst({ where: { id: claims.userId, lojaId: claims.lojaId }, select: { role: true, tokenVersion: true } });
    if (!user || user.role !== claims.role || (claims.tokenVersion ?? 0) !== user.tokenVersion) {
      res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' }); return;
    }
    req.user = claims;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

export function requireLojista(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'LOJISTA') {
      res.status(403).json({ error: 'Acesso restrito ao lojista' });
      return;
    }
    next();
  });
}
