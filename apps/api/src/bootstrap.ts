import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

// Only a genuinely empty database may be initialized. Never resets business data.
const prisma = new PrismaClient();
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error('First deployment requires ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters).');
  }
  const senhaHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(3196001)`;
    if (await tx.loja.count() !== 0) return;
    await tx.loja.create({
      data: {
        chavePublica: 'vox-celular', nome: 'Vox Celular', telefone: '5542991031420',
        endereco: 'Av. Maximiliano Vicentin, 710', cidade: 'Palmital–PR',
        mapsUrl: 'https://maps.google.com/?q=Av.+Maximiliano+Vicentin,+710,+Palmital+PR',
        config: { create: {} },
        usuarios: { create: { nome: 'Vox Admin', email, senhaHash, role: 'LOJISTA' } },
      },
    });
  });
  console.log('Bootstrap completed without deleting or replacing existing data.');
}
main().catch(() => { console.error('Bootstrap failed. Check initialization configuration.'); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
