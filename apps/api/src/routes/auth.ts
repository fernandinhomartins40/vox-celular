import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { createSession, hashRefresh, readRefresh, refreshCookie, refreshValue, sessionResponse, webOrigin } from '../lib/sessions.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { authLimits } from '../lib/authLimits.js';
import { newPasswordSchema } from '../lib/passwordPolicy.js';

export const authRouter = Router();
authRouter.use(['/login', '/register', '/refresh', '/senha'], authLimits);

authRouter.patch('/senha', requireAuth, async (req: AuthRequest, res) => {
  const parsed = z.object({ senhaAtual: z.string().min(1).max(72), novaSenha: newPasswordSchema }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Use uma nova senha de 12 a 72 caracteres. Se usar muitos acentos ou emojis, reduza o tamanho.' }); return; }
  try {
    const user = await prisma.usuario.findUnique({ where: { id: req.user!.userId } });
    if (!user || !(await bcrypt.compare(parsed.data.senhaAtual, user.senhaHash))) {
      res.status(400).json({ error: 'Senha atual incorreta.' }); return;
    }
    const senhaHash = await bcrypt.hash(parsed.data.novaSenha, 12);
    const changed = await prisma.usuario.updateMany({ where: { id: user.id, senhaHash: user.senhaHash }, data: { senhaHash, tokenVersion: { increment: 1 } } });
    if (changed.count !== 1) { res.status(409).json({ error: 'Senha alterada em outra sessão.' }); return; }
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Não foi possível alterar a senha.' }); }
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
  lojaId: z.string().min(1).optional(),
  plataforma: z.enum(['web', 'native']).optional(),
});

const registerSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: newPasswordSchema,
  telefone: z.string().optional(),
  cidade: z.string().optional(),
  lojaId: z.string(),
  plataforma: z.enum(['web', 'native']).optional(),
});

authRouter.post('/login', async (req, res) => {
  if (req.body?.plataforma === 'web' && !webOrigin(req)) { res.status(403).json({ error: 'Origem não autorizada.' }); return; }
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.errors }); return; }

  const { email, senha, lojaId } = parse.data;
  const candidates = await prisma.usuario.findMany({ where: { email, ...(lojaId ? { lojaId } : {}) }, take: 2 });
  const usuario = candidates.length === 1 ? candidates[0] : null;
  if (!usuario) { res.status(401).json({ error: 'Credenciais inválidas' }); return; }

  const ok = await bcrypt.compare(senha, usuario.senhaHash);
  if (!ok) { res.status(401).json({ error: 'Credenciais inválidas' }); return; }

  res.set('Cache-Control', 'no-store');
  res.json(await createSession(usuario, req, res));
});

authRouter.post('/register', async (req, res) => {
  if (req.body?.plataforma === 'web' && !webOrigin(req)) { res.status(403).json({ error: 'Origem não autorizada.' }); return; }
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.errors.some(issue => issue.path[0] === 'senha') ? 'Use uma senha de 12 a 72 caracteres. Se usar muitos acentos ou emojis, reduza o tamanho.' : 'Confira seu nome, e-mail e os dados do cadastro.' }); return; }

  const { nome, email, senha, telefone, cidade, lojaId } = parse.data;

  const exists = await prisma.usuario.findUnique({ where: { lojaId_email: { lojaId, email } } });
  if (exists) { res.status(409).json({ error: 'Email já cadastrado' }); return; }

  const senhaHash = await bcrypt.hash(senha, 12);
  const usuario = await prisma.usuario.create({
    data: {
      nome, email, senhaHash, lojaId, role: 'CLIENTE',
      cliente: {
        create: {
          lojaId,
          telefone: telefone || '',
          cidade: cidade || 'Palmital–PR',
          pontos: 50,
          nivel: 'Bronze',
          historicoP: {
            create: { pontos: 50, tipo: 'BONUS', descricao: 'Bônus de cadastro' }
          }
        }
      }
    },
    include: { cliente: true }
  });

  res.set('Cache-Control', 'no-store');
  res.status(201).json(await createSession(usuario, req, res));
});

authRouter.post('/refresh', async (req, res) => {
  const native = req.body?.plataforma === 'native';
  if (!native && !webOrigin(req)) { res.status(403).json({ error: 'Origem não autorizada.' }); return; }
  const value = native ? req.body?.refreshToken : readRefresh(req);
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) { res.status(401).json({ error: 'Entre novamente.' }); return; }
  try {
    const next = refreshValue();
    const result = await prisma.$transaction(async tx => {
      const row = await tx.sessao.findUnique({ where: { token: hashRefresh(value) }, include: { usuario: true } });
      if (!row || row.expiresAt <= new Date() || row.tokenVersion !== row.usuario.tokenVersion) throw new Error('EXPIRED');
      const changed = await tx.sessao.updateMany({ where: { id: row.id, token: row.token }, data: { token: hashRefresh(next) } });
      if (changed.count !== 1) throw new Error('REUSED');
      return sessionResponse(row.usuario, row.id);
    });
    res.set('Cache-Control', 'no-store');
    if (native) res.json({ ...result, refreshToken: next });
    else { refreshCookie(res, next); res.json(result); }
  } catch { res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' }); }
});
authRouter.post('/logout', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user!.sessionId) await prisma.sessao.deleteMany({ where: { id: req.user!.sessionId, usuarioId: req.user!.userId } });
    else await prisma.usuario.update({ where: { id: req.user!.userId }, data: { tokenVersion: { increment: 1 } } });
    refreshCookie(res, ''); res.json({ ok: true });
  } catch { res.status(503).json({ error: 'Não foi possível encerrar a sessão no servidor.' }); }
});

authRouter.get('/sessoes', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await prisma.sessao.findMany({ where: { usuarioId: req.user!.userId, tokenVersion: req.user!.tokenVersion ?? 0, expiresAt: { gt: new Date() } }, select: { id: true, createdAt: true, expiresAt: true }, orderBy: { createdAt: 'desc' }, take: 10 });
    res.set('Cache-Control', 'no-store').json(rows.map(row => ({ ...row, atual: row.id === req.user!.sessionId })));
  } catch { res.status(503).json({ error: 'Não foi possível consultar as sessões.' }); }
});
authRouter.delete('/sessoes/:id', requireAuth, async (req: AuthRequest, res) => {
  if (req.params.id === req.user!.sessionId) { res.status(409).json({ error: 'Use Sair da conta para encerrar o acesso atual.' }); return; }
  try {
    await prisma.sessao.deleteMany({ where: { id: String(req.params.id), usuarioId: req.user!.userId } });
    res.json({ ok: true });
  } catch { res.status(503).json({ error: 'Não foi possível encerrar o acesso.' }); }
});

authRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.user!.userId },
    include: { cliente: true }
  });
  if (!usuario) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }
  const { senhaHash: _, ...safe } = usuario;
  res.json(safe);
});
