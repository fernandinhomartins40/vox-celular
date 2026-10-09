import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.patch('/senha', requireAuth, async (req: AuthRequest, res) => {
  const parsed = z.object({ senhaAtual: z.string().min(1).max(72), novaSenha: z.string().min(12).max(72) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Use uma nova senha entre 12 e 72 caracteres.' }); return; }
  try {
    const user = await prisma.usuario.findUnique({ where: { id: req.user!.userId } });
    if (!user || !(await bcrypt.compare(parsed.data.senhaAtual, user.senhaHash))) {
      res.status(400).json({ error: 'Senha atual incorreta.' }); return;
    }
    const senhaHash = await bcrypt.hash(parsed.data.novaSenha, 12);
    const changed = await prisma.usuario.updateMany({ where: { id: user.id, senhaHash: user.senhaHash }, data: { senhaHash } });
    if (changed.count !== 1) { res.status(409).json({ error: 'Senha alterada em outra sessão.' }); return; }
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Não foi possível alterar a senha.' }); }
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
});

const registerSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
  telefone: z.string().optional(),
  cidade: z.string().optional(),
  lojaId: z.string(),
});

authRouter.post('/login', async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.errors }); return; }

  const { email, senha } = parse.data;
  const usuario = await prisma.usuario.findFirst({ where: { email } });
  if (!usuario) { res.status(401).json({ error: 'Credenciais inválidas' }); return; }

  const ok = await bcrypt.compare(senha, usuario.senhaHash);
  if (!ok) { res.status(401).json({ error: 'Credenciais inválidas' }); return; }

  const token = signToken({ userId: usuario.id, lojaId: usuario.lojaId, role: usuario.role });
  res.json({
    token,
    user: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role, lojaId: usuario.lojaId }
  });
});

authRouter.post('/register', async (req, res) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.errors }); return; }

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

  const token = signToken({ userId: usuario.id, lojaId: usuario.lojaId, role: usuario.role });
  res.status(201).json({
    token,
    user: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role, lojaId: usuario.lojaId }
  });
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
