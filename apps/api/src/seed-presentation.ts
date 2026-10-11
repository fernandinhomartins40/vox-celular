import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { storeImage } from './lib/imageStorage.js';

const prisma = new PrismaClient();
async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRESENTATION_SEED !== 'true') throw new Error('Explicit presentation authorization required.');
  if (!process.env.DEMO_STORE_ID && await prisma.loja.count() !== 1) throw new Error('Select DEMO_STORE_ID for multiple stores.');
  const loja = process.env.DEMO_STORE_ID ? await prisma.loja.findUnique({ where: { id: process.env.DEMO_STORE_ID } }) : await prisma.loja.findFirst();
  if (!loja) throw new Error('Store not found.');
  const prefix = `vox-demo-v1-${loja.id}-`;
  const images: string[] = [];
  for (let n = 0; n < 16; n++) images.push(await storeImage(await readFile(path.resolve('assets/catalog', `product-${n}.webp`)), 'catalogo', loja.id));
  const clean = (value: string) => value.replace(/^\[TESTE\]\s*/, '');
  const subtitles = ['256 GB · Grafite', '128 GB · Preto', '256 GB · Azul', '256 GB · Grafite', '128 GB · Azul-marinho', '256 GB · Grafite', '128 GB · Preto · Revisado', '256 GB · Preto · Revisado', 'Transparente · Proteção diária', 'Vidro temperado · Proteção de tela', 'USB-C · 20 W', 'USB-C para USB-C · 1 metro', 'Bluetooth · Estojo de recarga', '10000 mAh · USB-C', 'Ajustável · Fixação por ventosa', 'Pulseira preta · Monitor de atividades'];
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(3196002)`;
    for (let n = 0; n < 32; n++) {
      const product = await tx.produto.findUnique({ where: { id: `${prefix}produto-${n}` } });
      if (!product || !product.nome.startsWith('[TESTE]')) continue;
      const name = clean(product.nome).replace(' - alternativa', ' — edição especial');
      await tx.produto.update({ where: { id: product.id }, data: { nome: name, sub: subtitles[n % 16], ativo: true, imgUrl: product.imgUrl || images[n % 16], descricao: product.categoria === 'Seminovos' ? `${name}. Aparelho revisado, pronto para uso. Consulte disponibilidade e condições na loja.` : `${name}. Consulte compatibilidade, disponibilidade e condições com nossa equipe.`, specs: product.categoria === 'Acessórios' ? ['Uso diário', 'Consulte compatibilidade'] : ['Consulte memória e cor disponíveis', 'Atendimento e suporte na loja'] } });
    }
    for (const user of await tx.usuario.findMany({ where: { lojaId: loja.id, id: { startsWith: prefix }, nome: { startsWith: '[TESTE]' } } })) await tx.usuario.update({ where: { id: user.id }, data: { nome: clean(user.nome) } });
    for (const offer of await tx.promocao.findMany({ where: { lojaId: loja.id, id: { startsWith: prefix }, titulo: { startsWith: '[TESTE]' } } })) await tx.promocao.update({ where: { id: offer.id }, data: { titulo: clean(offer.titulo), descricao: 'Condição especial para compra na loja. Consulte disponibilidade com nossa equipe.', ativa: true } });
    for (const reward of await tx.recompensaCatalogo.findMany({ where: { lojaId: loja.id, id: { startsWith: prefix }, titulo: { startsWith: '[TESTE]' } } })) await tx.recompensaCatalogo.update({ where: { id: reward.id }, data: { titulo: clean(reward.titulo) } });
    for (const history of await tx.historicoPontos.findMany({ where: { cliente: { lojaId: loja.id }, id: { startsWith: prefix }, descricao: { startsWith: '[TESTE]' } } })) await tx.historicoPontos.update({ where: { id: history.id }, data: { descricao: history.tipo === 'BONUS' ? 'Bônus de boas-vindas' : clean(history.descricao) } });
    for (const order of await tx.pedido.findMany({ where: { lojaId: loja.id, id: { startsWith: prefix }, codigo: { startsWith: 'TESTE-VOX-' } } })) await tx.pedido.update({ where: { id: order.id }, data: { codigo: order.codigo.replace('TESTE-VOX-', 'VOX-AP-') } });
    for (const receipt of await tx.resgateRecompensa.findMany({ where: { id: { startsWith: prefix }, codigo: { startsWith: 'TESTE-' } } })) await tx.resgateRecompensa.update({ where: { id: receipt.id }, data: { codigo: receipt.codigo.replace('TESTE-', 'VOX-R-') } });
    for (const item of await tx.itemPedido.findMany({ where: { pedido: { lojaId: loja.id, id: { startsWith: prefix } }, nome: { startsWith: '[TESTE]' } } })) await tx.itemPedido.update({ where: { id: item.id }, data: { nome: clean(item.nome) } });
  }, { timeout: 120000 });
  console.log('Presentation catalog ready. Only original demo records updated; existing business data and edited images preserved.');
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
