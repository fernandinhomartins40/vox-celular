import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, StatusPedido } from '@prisma/client';

const prisma = new PrismaClient();
const marker = 'vox-demo-v1';
async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') throw new Error('Explicit ALLOW_DEMO_SEED=true required.');
  const password = process.env.TEST_CUSTOMER_PASSWORD;
  if (!password || password.length < 12) throw new Error('Test customer password must have 12+ characters.');
  if (!process.env.DEMO_STORE_ID && await prisma.loja.count() !== 1) throw new Error('Select DEMO_STORE_ID when multiple stores exist.');
  const loja = process.env.DEMO_STORE_ID ? await prisma.loja.findUnique({ where: { id: process.env.DEMO_STORE_ID } }) : await prisma.loja.findFirst();
  if (!loja) throw new Error('Store must exist.');
  const hash = await bcrypt.hash(password, 12);
  const now = new Date();
  const date = (days: number) => new Date(now.getTime() - days * 86400000);
  const id = (kind: string, n: number) => `${marker}-${loja.id}-${kind}-${n}`;
  const names = ['Mariana Silva', 'Rafael Oliveira', 'Camila Santos', 'Bruno Ferreira', 'Juliana Costa', 'Lucas Pereira', 'Fernanda Almeida', 'Diego Rodrigues', 'Patricia Lima', 'Gustavo Martins', 'Amanda Ribeiro', 'Felipe Gomes', 'Carolina Barbosa', 'Thiago Souza', 'Beatriz Rocha', 'Pedro Carvalho', 'Larissa Mendes', 'Eduardo Dias', 'Renata Moreira', 'Vinicius Nunes', 'Leticia Araujo', 'Andre Cardoso', 'Isabela Teixeira', 'Gabriel Melo', 'Daniela Castro', 'Matheus Correia', 'Natalia Ramos', 'Leonardo Vieira', 'Vanessa Lopes', 'Ricardo Farias'];
  const catalog: [string, string, number][] = [
    ['Samsung Galaxy A55 5G', 'Celulares', 2299], ['iPhone 15 128 GB', 'Celulares', 5499], ['Motorola Edge 50', 'Celulares', 1899], ['Xiaomi Redmi 13', 'Celulares', 1199],
    ['Samsung Galaxy A35', 'Celulares', 1599], ['Motorola Moto G85', 'Celulares', 1799], ['iPhone 14 revisado', 'Seminovos', 3299], ['Galaxy S23 revisado', 'Seminovos', 2499],
    ['Capa transparente', 'Acessórios', 39.9], ['Película de vidro', 'Acessórios', 29.9], ['Carregador USB-C 20 W', 'Acessórios', 89.9], ['Cabo USB-C 1 metro', 'Acessórios', 24.9],
    ['Fone Bluetooth', 'Acessórios', 149.9], ['Power bank 10000 mAh', 'Acessórios', 139.9], ['Suporte veicular', 'Acessórios', 49.9], ['Smartwatch esportivo', 'Acessórios', 249.9],
  ];
  const statuses: StatusPedido[] = ['NOVO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE'];
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(3196002)`;
    // A completed batch is never reset: user edits, passwords and resgates survive reruns.
    if (await tx.pedido.findUnique({ where: { lojaId_codigo: { lojaId: loja.id, codigo: 'TESTE-VOX-090' } } })) {
      console.log('Demo batch already exists; all user changes preserved.'); return;
    }
    for (let n = 0; n < 32; n++) {
      const [name, categoria, preco] = catalog[n % catalog.length];
      await tx.produto.create({ data: { id: id('produto', n), lojaId: loja.id, nome: `[TESTE] ${name}${n >= 16 ? ' - alternativa' : ''}`, categoria, preco, precoOriginal: preco + 30, sub: n < 8 ? '128 GB · Grafite' : 'Modelo demonstrativo', imgUrl: '', descricao: 'Cadastro fictício para testar edição, estoque, fotos e publicação. Não representa oferta comercial.', estoque: n % 7 === 0 ? 0 : n % 5 === 0 ? 2 : 10 + n, ativo: false, destaque: n < 4, specs: ['Dados demonstrativos', 'Sem compromisso comercial'], createdAt: date(60 - n) } });
    }
    const costs = [50, 100, 200, 300, 400, 600, 800, 1200];
    const titles = ['Película de proteção', 'Desconto em acessórios', 'Capa de celular', 'Vale de R$ 30', 'Fone de ouvido', 'Vale de R$ 50', 'Carregador USB-C', 'Vale de R$ 100'];
    for (let n = 0; n < 8; n++) await tx.recompensaCatalogo.create({ data: { id: id('recompensa', n), lojaId: loja.id, titulo: `[TESTE] ${titles[n]}`, pontos: costs[n], ativo: true } });
    for (let n = 0; n < 30; n++) {
      const email = n === 0 ? 'teste.cliente@voxcelular.example' : `teste.cliente${String(n + 1).padStart(2, '0')}@voxcelular.example`;
      if (await tx.usuario.findFirst({ where: { lojaId: loja.id, email } })) throw new Error('Demo email collision; existing accounts preserved.');
      const user = await tx.usuario.create({ data: { id: id('usuario', n), lojaId: loja.id, nome: `[TESTE] ${names[n]}`, email, senhaHash: hash, role: 'CLIENTE', createdAt: date(90 - n) } });
      let totalGasto = 0;
      for (let j = 0; j < 3; j++) { const k = n * 3 + j; if (statuses[k % 4] === 'ENTREGUE') totalGasto += catalog[k % 16][2] + catalog[8 + k % 8][2]; }
      const spent = n < 12 ? 50 : 0;
      const earned = 200 + n * 50;
      const points = earned - spent;
      await tx.cliente.create({ data: { id: id('cliente', n), lojaId: loja.id, usuarioId: user.id, telefone: '', cidade: ['Palmital–PR', 'Cantagalo–PR', 'Laranjal–PR'][n % 3], pontos: points, nivel: points >= 1200 ? 'Platina' : points >= 600 ? 'Ouro' : points >= 200 ? 'Prata' : 'Bronze', totalGasto, createdAt: date(90 - n) } });
      await tx.historicoPontos.create({ data: { id: id('bonus', n), clienteId: id('cliente', n), pontos: earned, tipo: 'BONUS', descricao: '[TESTE] Saldo inicial para experimentar recompensas', createdAt: date(15) } });
      if (spent) {
        await tx.resgateRecompensa.create({ data: { id: id('resgate', n), clienteId: id('cliente', n), recompensaId: id('recompensa', 0), codigo: `TESTE-${loja.id}-${String(n + 1).padStart(3, '0')}`, usadoEm: n % 3 === 0 ? date(2) : null, createdAt: date(5) } });
        await tx.historicoPontos.create({ data: { id: id('debito', n), clienteId: id('cliente', n), pontos: -spent, tipo: 'RESGATE', descricao: '[TESTE] Película de proteção', createdAt: date(5) } });
      }
    }
    for (let n = 0; n < 12; n++) await tx.promocao.create({ data: { id: id('oferta', n), lojaId: loja.id, produtoId: id('produto', n), titulo: `[TESTE] Oferta ${catalog[n][0]}`, descricao: 'Oferta fictícia para validação. Ative somente durante seus testes.', preco: catalog[n][2] * .9, precoOriginal: catalog[n][2], validade: new Date(now.getTime() + (n < 10 ? 30 : -2) * 86400000), ativa: false } });
    for (let n = 0; n < 90; n++) {
      const a = n % 16, b = 8 + n % 8;
      const current = n % 4;
      const createdAt = date(n % 60);
      await tx.pedido.create({ data: { id: id('pedido', n), lojaId: loja.id, clienteId: id('cliente', Math.floor(n / 3)), codigo: `TESTE-VOX-${String(n + 1).padStart(3, '0')}`, status: statuses[current], pagamento: ['Pix', 'Cartão de crédito', 'Dinheiro'][n % 3], total: catalog[a][2] + catalog[b][2], createdAt,
        itens: { create: [a, b].map(k => ({ produtoId: id('produto', k), nome: `[TESTE] ${catalog[k][0]}`, qty: 1, preco: catalog[k][2] })) },
        timeline: { create: statuses.map((status, ordem) => ({ status, ordem, ok: ordem <= current, data: ordem <= current ? new Date(createdAt.getTime() + ordem * 60000) : null })) },
      } });
    }
    console.log('Demo batch created: 32 products, 30 customers, 90 orders, 12 offers, 8 rewards, 12 receipts, 42 point records.');
  }, { timeout: 120000, maxWait: 10000 });
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
