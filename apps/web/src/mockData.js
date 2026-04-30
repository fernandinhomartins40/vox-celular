// Dados mock para os painéis (substituir por chamadas de API no backend)

export const MOCK_PEDIDOS = [
  { id: '#VOX-001', cliente: 'João Silva',     email: 'joao@email.com',    produtos: [{ nome: 'Galaxy A55 5G', qty: 1, preco: 2299 }],                         total: 2299,  status: 'Entregue',   data: '2026-04-28', pagamento: 'Cartão 12x' },
  { id: '#VOX-002', cliente: 'Marina Silveira', email: 'marina@email.com',  produtos: [{ nome: 'Capa Anti-Impacto', qty: 2, preco: 49 }, { nome: 'Película 3D', qty: 1, preco: 39 }], total: 137,   status: 'Pronto',     data: '2026-04-29', pagamento: 'PIX' },
  { id: '#VOX-003', cliente: 'Roberto Faria',   email: 'roberto@email.com', produtos: [{ nome: 'iPhone 15', qty: 1, preco: 5499 }],                              total: 5499,  status: 'Em preparo', data: '2026-04-30', pagamento: 'Cartão 12x' },
  { id: '#VOX-004', cliente: 'Aline Tavares',   email: 'aline@email.com',   produtos: [{ nome: 'Fone Bluetooth Pro', qty: 1, preco: 159 }],                      total: 159,   status: 'Novo',       data: '2026-04-30', pagamento: 'PIX' },
  { id: '#VOX-005', cliente: 'Carlos Mendes',   email: 'carlos@email.com',  produtos: [{ nome: 'Motorola Edge 50', qty: 1, preco: 1899 }],                       total: 1899,  status: 'Em preparo', data: '2026-04-29', pagamento: 'Dinheiro' },
  { id: '#VOX-006', cliente: 'Fernanda Lima',   email: 'fernanda@email.com',produtos: [{ nome: 'Carregador Turbo 65W', qty: 1, preco: 119 }, { nome: 'Capa Anti-Impacto', qty: 1, preco: 49 }], total: 168, status: 'Entregue', data: '2026-04-27', pagamento: 'Cartão 3x' },
  { id: '#VOX-007', cliente: 'Pedro Costa',     email: 'pedro@email.com',   produtos: [{ nome: 'Xiaomi Redmi 13', qty: 1, preco: 1199 }],                        total: 1199,  status: 'Novo',       data: '2026-04-30', pagamento: 'PIX' },
  { id: '#VOX-008', cliente: 'João Silva',      email: 'joao@email.com',    produtos: [{ nome: 'Chip TIM Pré-Pago', qty: 2, preco: 25 }],                        total: 50,    status: 'Entregue',   data: '2026-04-20', pagamento: 'Dinheiro' },
];

export const MOCK_CLIENTES = [
  { id: 1, nome: 'João Silva',     email: 'joao@email.com',    telefone: '(42) 99101-1111', cidade: 'Palmital–PR', pontos: 480, totalGasto: 2349,  pedidos: 2, cadastro: '2026-01-15' },
  { id: 2, nome: 'Marina Silveira',email: 'marina@email.com',  telefone: '(42) 99102-2222', cidade: 'Palmital–PR', pontos: 137, totalGasto: 137,   pedidos: 1, cadastro: '2026-02-08' },
  { id: 3, nome: 'Roberto Faria',  email: 'roberto@email.com', telefone: '(42) 99103-3333', cidade: 'Cantagalo–PR',pontos: 549, totalGasto: 5499,  pedidos: 1, cadastro: '2026-03-20' },
  { id: 4, nome: 'Aline Tavares',  email: 'aline@email.com',   telefone: '(42) 99104-4444', cidade: 'Palmital–PR', pontos: 215, totalGasto: 1590,  pedidos: 3, cadastro: '2026-01-30' },
  { id: 5, nome: 'Carlos Mendes',  email: 'carlos@email.com',  telefone: '(42) 99105-5555', cidade: 'Palmital–PR', pontos: 189, totalGasto: 1899,  pedidos: 1, cadastro: '2026-04-01' },
];

export const MOCK_METRICAS = {
  faturamentoMes: 14250,
  faturamentoOntem: 1899,
  pedidosHoje: 3,
  pedidosMes: 24,
  clientesNovos: 5,
  estoqueBaixo: 3,
  ticketMedio: 594,
  grafico: [
    { dia: '24/04', valor: 1199 },
    { dia: '25/04', valor: 2450 },
    { dia: '26/04', valor: 890  },
    { dia: '27/04', valor: 3200 },
    { dia: '28/04', valor: 2299 },
    { dia: '29/04', valor: 2068 },
    { dia: '30/04', valor: 2157 },
  ],
};

export const MOCK_PONTOS_CLIENTE = {
  saldo: 480,
  meta: 600,
  nivel: 'Prata',
  proximoNivel: 'Ouro',
  historico: [
    { data: '2026-04-28', descricao: 'Compra Galaxy A55 5G', pontos: +230, tipo: 'ganho' },
    { data: '2026-04-20', descricao: 'Compra Chip TIM (2x)',  pontos: +5,   tipo: 'ganho' },
    { data: '2026-03-10', descricao: 'Resgate desconto R$20', pontos: -200, tipo: 'resgate' },
    { data: '2026-02-15', descricao: 'Compra Película 3D',   pontos: +4,   tipo: 'ganho' },
    { data: '2026-01-20', descricao: 'Bônus de cadastro',    pontos: +50,  tipo: 'bonus' },
  ],
  recompensas: [
    { id: 1, titulo: 'Desconto R$ 20',      pontos: 200, disponivel: true },
    { id: 2, titulo: 'Película grátis',     pontos: 350, disponivel: true },
    { id: 3, titulo: 'Frete grátis',        pontos: 100, disponivel: true },
    { id: 4, titulo: 'Desconto 10%',        pontos: 500, disponivel: false },
    { id: 5, titulo: 'Capa de brinde',      pontos: 700, disponivel: false },
  ],
};

export const MOCK_PEDIDOS_CLIENTE = MOCK_PEDIDOS.filter(p => p.email === 'joao@email.com').map(p => ({
  ...p,
  timeline: [
    { status: 'Pedido recebido',  data: p.data + ' 09:00', ok: true },
    { status: 'Pagamento confirmado', data: p.data + ' 09:15', ok: true },
    { status: 'Em preparo',       data: p.status !== 'Novo' ? p.data + ' 10:00' : null, ok: p.status !== 'Novo' },
    { status: 'Pronto para retirada', data: p.status === 'Entregue' || p.status === 'Pronto' ? p.data + ' 14:00' : null, ok: p.status === 'Entregue' || p.status === 'Pronto' },
    { status: 'Entregue',         data: p.status === 'Entregue' ? p.data + ' 15:30' : null, ok: p.status === 'Entregue' },
  ],
}));

export const MOCK_PROMOCOES_CLIENTE = [
  { id: 1, titulo: 'Exclusivo para você!', desc: 'Galaxy A55 5G com R$ 200 de desconto por ser cliente Prata.', preco: 2099, precoOriginal: 2299, validade: '2026-05-05', img: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&q=80' },
  { id: 2, titulo: 'Acessório em dobro',   desc: 'Compre 1 capa e leve 2. Válido só para clientes cadastrados.', preco: 49,   precoOriginal: 79,   validade: '2026-05-03', img: 'https://images.unsplash.com/photo-1601593346740-925612772716?w=600&q=80' },
  { id: 3, titulo: 'Fone com desconto',    desc: 'Fone Bluetooth Pro com 30% off. Exclusivo área do cliente.', preco: 111,  precoOriginal: 159,  validade: '2026-05-10', img: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600&q=80' },
];
