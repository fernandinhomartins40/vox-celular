import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_TEST_ADMIN_SEED !== 'true') throw new Error('Explicit ALLOW_TEST_ADMIN_SEED=true required in production.');
  const email = process.env.TEST_ADMIN_EMAIL || 'teste.lojista@voxcelular.com.br';
  const password = process.env.TEST_ADMIN_PASSWORD;
  if (!password || password.length < 12) throw new Error('TEST_ADMIN_PASSWORD must have 12+ characters.');
  const loja = await prisma.loja.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!loja) throw new Error('Initialize store with bootstrap first.');
  const existing = await prisma.usuario.findFirst({ where: { email } });
  if (existing) {
    if (existing.role !== 'LOJISTA' || existing.lojaId !== loja.id) throw new Error('Email belongs to another account.');
    console.log('Existing test operator preserved.'); return;
  }
  await prisma.usuario.create({ data: { lojaId: loja.id, nome: 'Lojista de teste', email, senhaHash: await bcrypt.hash(password, 12), role: 'LOJISTA' } });
  console.log('Test operator created; business data preserved.');
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
