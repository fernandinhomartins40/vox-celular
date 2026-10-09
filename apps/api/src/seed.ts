import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo seed is disabled in production. Use the non-destructive bootstrap.');
  }
  console.log('Seeding database...');

  // Clear existing data
  await prisma.resgateRecompensa.deleteMany();
  await prisma.historicoPontos.deleteMany();
  await prisma.timelinePedido.deleteMany();
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.promocao.deleteMany();
  await prisma.recompensaCatalogo.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.sessao.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.lojaConfig.deleteMany();
  await prisma.loja.deleteMany();

  // Create Loja
  const loja = await prisma.loja.create({
    data: {
      nome: 'Vox Celular',
      telefone: '5542991031420',
      endereco: 'Av. Maximiliano Vicentin, 710',
      cidade: 'Palmital–PR',
      mapsUrl: 'https://maps.google.com/?q=Av.+Maximiliano+Vicentin,+710,+Palmital+PR',
      config: {
        create: {
          heroSlide1Titulo: 'Plano TIM Controle com 20 GB + apps',
          heroSlide1Sub: 'Portabilidade grátis, ativação na hora.',
          heroSlide1Preco: '49,90',
          horarioSemana: 'Seg–Sex 8h–19h',
          horarioSabado: 'Sáb 8h–13h',
        }
      }
    }
  });

  // Hash password (reused for all demo users)
  const hash = await bcrypt.hash('123456', 12);

  // Lojista
  await prisma.usuario.create({
    data: {
      lojaId: loja.id,
      nome: 'Vox Admin',
      email: 'lojista@vox.com',
      senhaHash: hash,
      role: 'LOJISTA',
    }
  });

  // Create all 12 products
  const produtos = await prisma.produto.createManyAndReturn({ data: [
    { lojaId: loja.id, nome: 'Galaxy A55 5G', sub: '256GB · Azul Marinho', categoria: 'Celulares', preco: 2299, precoOriginal: 2799, badge: 'OFERTA', imgUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=900&q=85', descricao: 'Tela Super AMOLED 6.6", câmera tripla 50MP, bateria 5000mAh.', estoque: 8, destaque: true, specs: ['256 GB / 8 GB RAM','Câmera 50 MP','5G + NFC','Bateria 5.000 mAh'] },
    { lojaId: loja.id, nome: 'iPhone 15', sub: '128GB · Preto', categoria: 'Celulares', preco: 5499, precoOriginal: 6199, badge: 'TOP VENDAS', imgUrl: 'https://images.unsplash.com/photo-1592286927505-1def25115558?w=900&q=85', descricao: 'Chip A16 Bionic, câmera 48MP, conector USB-C.', estoque: 4, destaque: true, specs: ['128 GB','Chip A16 Bionic','USB-C','1 ano de garantia'] },
    { lojaId: loja.id, nome: 'Motorola Edge 50', sub: '256GB · Azul', categoria: 'Celulares', preco: 1899, precoOriginal: 2299, badge: 'NOVO', imgUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=900&q=85', descricao: 'Tela pOLED 144Hz, câmera 50MP com OIS.', estoque: 6, specs: ['256 GB / 8 GB','pOLED 144 Hz','Câmera 50 MP OIS','IP68'] },
    { lojaId: loja.id, nome: 'Xiaomi Redmi 13', sub: '256GB · Grafite', categoria: 'Celulares', preco: 1199, precoOriginal: 1499, badge: 'OFERTA', imgUrl: 'https://images.unsplash.com/photo-1567581935884-3349723552ca?w=900&q=85', descricao: 'Bateria 5030mAh, câmera 108MP.', estoque: 12, specs: ['256 GB / 8 GB','Câmera 108 MP','Bateria 5.030 mAh','Tela 90 Hz'] },
    { lojaId: loja.id, nome: 'Capa Anti-Impacto', sub: 'Vários modelos', categoria: 'Acessórios', preco: 49, precoOriginal: 79, badge: 'OFERTA', imgUrl: 'https://images.unsplash.com/photo-1601593346740-925612772716?w=900&q=85', descricao: 'Proteção militar com bordas reforçadas.', estoque: 30, specs: ['Bordas reforçadas','Padrão MIL-STD','Vários modelos','Toque suave'] },
    { lojaId: loja.id, nome: 'Carregador Turbo 65W', sub: 'USB-C · GaN', categoria: 'Acessórios', preco: 119, precoOriginal: 169, badge: 'TOP VENDAS', imgUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=900&q=85', descricao: 'Carregamento rápido GaN, compatível com PD e QC.', estoque: 18, specs: ['65 W GaN','PD + QC','Cabo incluso','Bivolt'] },
    { lojaId: loja.id, nome: 'Fone Bluetooth Pro', sub: 'ANC · BT 5.3', categoria: 'Acessórios', preco: 159, precoOriginal: 219, badge: 'NOVO', imgUrl: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=900&q=85', descricao: 'Cancelamento ativo de ruído, bateria 30h.', estoque: 14, specs: ['ANC ativo','30 h bateria','BT 5.3','Toque sensível'] },
    { lojaId: loja.id, nome: 'Película 3D Vidro', sub: 'Aplicação grátis', categoria: 'Acessórios', preco: 39, imgUrl: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=900&q=85', descricao: 'Cobertura total, dureza 9H. Aplicação grátis.', estoque: 50, specs: ['Dureza 9H','Borda 3D','Aplicação grátis','Anti-impacto'] },
    { lojaId: loja.id, nome: 'iPhone 13 Seminovo', sub: '128GB · Revisado', categoria: 'Seminovos', preco: 2799, precoOriginal: 3499, badge: 'SEMINOVO', imgUrl: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=900&q=85', descricao: 'Aparelho revisado, bateria acima de 85%.', estoque: 3, specs: ['Bateria 85%+','90 dias de garantia','Revisado em loja','Acessórios novos'] },
    { lojaId: loja.id, nome: 'Galaxy A52 Seminovo', sub: '128GB · AMOLED', categoria: 'Seminovos', preco: 1199, precoOriginal: 1599, badge: 'SEMINOVO', imgUrl: 'https://images.unsplash.com/photo-1610792516775-01de03eae630?w=900&q=85', descricao: 'Tela AMOLED 6.5", excelente estado.', estoque: 5, specs: ['AMOLED 6.5"','Câmera 64 MP','90 dias de garantia','Revisado'] },
    { lojaId: loja.id, nome: 'Chip TIM Pré-Pago', sub: '20GB primeiro mês', categoria: 'Serviços', preco: 25, badge: 'TIM', imgUrl: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=900&q=85', descricao: '20GB no primeiro mês + WhatsApp ilimitado.', estoque: 99, specs: ['20 GB primeiro mês','WhatsApp ilimitado','Ativação grátis','Pré-pago'] },
    { lojaId: loja.id, nome: 'Smartwatch Fit Plus', sub: 'GPS · IP68', categoria: 'Acessórios', preco: 299, precoOriginal: 449, badge: 'OFERTA', imgUrl: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=900&q=85', descricao: 'Monitor cardíaco, GPS, resistente à água.', estoque: 9, specs: ['GPS integrado','Monitor cardíaco','IP68','Bateria 7 dias'] },
  ]});

  const pByName = (name: string) => produtos.find((p: { nome: string; id: string }) => p.nome === name)!;

  // Create clientes (users + cliente records)
  const clientesData = [
    { nome: 'João Silva', email: 'joao@email.com', telefone: '(42) 99101-1111', cidade: 'Palmital–PR', pontos: 480, nivel: 'Prata', totalGasto: 2349 },
    { nome: 'Marina Silveira', email: 'marina@email.com', telefone: '(42) 99102-2222', cidade: 'Palmital–PR', pontos: 137, nivel: 'Bronze', totalGasto: 137 },
    { nome: 'Roberto Faria', email: 'roberto@email.com', telefone: '(42) 99103-3333', cidade: 'Cantagalo–PR', pontos: 549, nivel: 'Prata', totalGasto: 5499 },
    { nome: 'Aline Tavares', email: 'aline@email.com', telefone: '(42) 99104-4444', cidade: 'Palmital–PR', pontos: 215, nivel: 'Prata', totalGasto: 1590 },
    { nome: 'Carlos Mendes', email: 'carlos@email.com', telefone: '(42) 99105-5555', cidade: 'Palmital–PR', pontos: 189, nivel: 'Bronze', totalGasto: 1899 },
  ];

  const clienteIds: Record<string, { usuarioId: string; clienteId: string }> = {};
  for (const c of clientesData) {
    const usuario = await prisma.usuario.create({
      data: {
        lojaId: loja.id, nome: c.nome, email: c.email, senhaHash: hash, role: 'CLIENTE',
        cliente: {
          create: {
            lojaId: loja.id, telefone: c.telefone, cidade: c.cidade,
            pontos: c.pontos, nivel: c.nivel, totalGasto: c.totalGasto,
          }
        }
      },
      include: { cliente: true }
    });
    clienteIds[c.email] = { usuarioId: usuario.id, clienteId: usuario.cliente!.id };
  }

  // Create recompensas catalog
  await prisma.recompensaCatalogo.createMany({ data: [
    { lojaId: loja.id, titulo: 'Desconto R$ 20', pontos: 200 },
    { lojaId: loja.id, titulo: 'Película grátis', pontos: 350 },
    { lojaId: loja.id, titulo: 'Frete grátis', pontos: 100 },
    { lojaId: loja.id, titulo: 'Desconto 10%', pontos: 500 },
    { lojaId: loja.id, titulo: 'Capa de brinde', pontos: 700 },
  ]});

  // Histórico de pontos for João
  const joaoClienteId = clienteIds['joao@email.com'].clienteId;
  await prisma.historicoPontos.createMany({ data: [
    { clienteId: joaoClienteId, pontos: 230, tipo: 'GANHO', descricao: 'Compra Galaxy A55 5G', createdAt: new Date('2026-04-28') },
    { clienteId: joaoClienteId, pontos: 5, tipo: 'GANHO', descricao: 'Compra Chip TIM (2x)', createdAt: new Date('2026-04-20') },
    { clienteId: joaoClienteId, pontos: -200, tipo: 'RESGATE', descricao: 'Resgate desconto R$20', createdAt: new Date('2026-03-10') },
    { clienteId: joaoClienteId, pontos: 4, tipo: 'GANHO', descricao: 'Compra Película 3D', createdAt: new Date('2026-02-15') },
    { clienteId: joaoClienteId, pontos: 50, tipo: 'BONUS', descricao: 'Bônus de cadastro', createdAt: new Date('2026-01-20') },
  ]});

  // Create orders
  const mkTimeline = (status: string) => {
    const statuses = ['NOVO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE'];
    const idx = statuses.indexOf(status);
    return [
      { status: 'Pedido recebido', ok: true, ordem: 0, data: new Date() },
      { status: 'Pagamento confirmado', ok: true, ordem: 1, data: new Date() },
      { status: 'Em preparo', ok: idx >= 1, ordem: 2, data: idx >= 1 ? new Date() : null },
      { status: 'Pronto para retirada', ok: idx >= 2, ordem: 3, data: idx >= 2 ? new Date() : null },
      { status: 'Entregue', ok: idx >= 3, ordem: 4, data: idx >= 3 ? new Date() : null },
    ];
  };

  type OrderDef = {
    codigo: string; clienteEmail: string; status: string; pagamento: string; total: number;
    data: string;
    itens: { produtoNome: string; qty: number; preco: number }[];
  };

  const ordersToCreate: OrderDef[] = [
    { codigo: '#VOX-001', clienteEmail: 'joao@email.com', status: 'ENTREGUE', pagamento: 'Cartão 12x', total: 2299, data: '2026-04-28', itens: [{ produtoNome: 'Galaxy A55 5G', qty: 1, preco: 2299 }] },
    { codigo: '#VOX-002', clienteEmail: 'marina@email.com', status: 'PRONTO', pagamento: 'PIX', total: 137, data: '2026-04-29', itens: [{ produtoNome: 'Capa Anti-Impacto', qty: 2, preco: 49 }, { produtoNome: 'Película 3D Vidro', qty: 1, preco: 39 }] },
    { codigo: '#VOX-003', clienteEmail: 'roberto@email.com', status: 'EM_PREPARO', pagamento: 'Cartão 12x', total: 5499, data: '2026-04-30', itens: [{ produtoNome: 'iPhone 15', qty: 1, preco: 5499 }] },
    { codigo: '#VOX-004', clienteEmail: 'aline@email.com', status: 'NOVO', pagamento: 'PIX', total: 159, data: '2026-04-30', itens: [{ produtoNome: 'Fone Bluetooth Pro', qty: 1, preco: 159 }] },
    { codigo: '#VOX-005', clienteEmail: 'carlos@email.com', status: 'EM_PREPARO', pagamento: 'Dinheiro', total: 1899, data: '2026-04-29', itens: [{ produtoNome: 'Motorola Edge 50', qty: 1, preco: 1899 }] },
    { codigo: '#VOX-006', clienteEmail: 'joao@email.com', status: 'ENTREGUE', pagamento: 'Cartão 3x', total: 168, data: '2026-04-27', itens: [{ produtoNome: 'Carregador Turbo 65W', qty: 1, preco: 119 }, { produtoNome: 'Capa Anti-Impacto', qty: 1, preco: 49 }] },
    { codigo: '#VOX-007', clienteEmail: 'aline@email.com', status: 'NOVO', pagamento: 'PIX', total: 1199, data: '2026-04-30', itens: [{ produtoNome: 'Xiaomi Redmi 13', qty: 1, preco: 1199 }] },
    { codigo: '#VOX-008', clienteEmail: 'joao@email.com', status: 'ENTREGUE', pagamento: 'Dinheiro', total: 50, data: '2026-04-20', itens: [{ produtoNome: 'Chip TIM Pré-Pago', qty: 2, preco: 25 }] },
  ];

  for (const o of ordersToCreate) {
    await prisma.pedido.create({
      data: {
        lojaId: loja.id,
        clienteId: clienteIds[o.clienteEmail].clienteId,
        codigo: o.codigo,
        status: o.status as any,
        pagamento: o.pagamento,
        total: o.total,
        createdAt: new Date(o.data),
        itens: {
          create: o.itens.map(it => ({
            produtoId: pByName(it.produtoNome).id,
            nome: it.produtoNome,
            qty: it.qty,
            preco: it.preco,
          }))
        },
        timeline: { create: mkTimeline(o.status) }
      }
    });
  }

  // Promotions
  await prisma.promocao.createMany({ data: [
    { lojaId: loja.id, produtoId: pByName('Galaxy A55 5G').id, titulo: 'Exclusivo para você!', descricao: 'Galaxy A55 5G com R$ 200 de desconto por ser cliente Prata.', preco: 2099, precoOriginal: 2299, validade: new Date('2026-05-05') },
    { lojaId: loja.id, produtoId: pByName('Capa Anti-Impacto').id, titulo: 'Acessório em dobro', descricao: 'Compre 1 capa e leve 2. Válido só para clientes cadastrados.', preco: 49, precoOriginal: 79, validade: new Date('2026-05-03') },
    { lojaId: loja.id, produtoId: pByName('Fone Bluetooth Pro').id, titulo: 'Fone com desconto', descricao: 'Fone Bluetooth Pro com 30% off. Exclusivo área do cliente.', preco: 111, precoOriginal: 159, validade: new Date('2026-05-10') },
  ]});

  console.log('Seed complete. Loja ID:', loja.id);
  console.log('Copy this to your .env: LOJA_ID=' + loja.id);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
