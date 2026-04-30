export const PHONE_DIGITS = '5542991031420';
export const PHONE_DISPLAY = '(42) 99103-1420';
export const ADDRESS = 'Av. Maximiliano Vicentin, 710, Palmital–PR';
export const MAPS_URL = 'https://maps.google.com/?q=Av.+Maximiliano+Vicentin,+710,+Palmital+PR';
export const MAPS_EMBED = 'https://maps.google.com/maps?q=Av.+Maximiliano+Vicentin+710+Palmital+PR&output=embed';

export const PRODUCTS = [
  { id: 1, nome: 'Galaxy A55 5G', sub: '256GB · Azul Marinho', categoria: 'Celulares', preco: 2299, precoOriginal: 2799, badge: 'OFERTA',
    img: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=900&q=85',
    descricao: 'Tela Super AMOLED 6.6", câmera tripla 50MP, bateria 5000mAh. Ideal para o dia a dia com sinal 5G da TIM.',
    estoque: 8, specs: ['256 GB / 8 GB RAM', 'Câmera 50 MP', '5G + NFC', 'Bateria 5.000 mAh'] },
  { id: 2, nome: 'iPhone 15', sub: '128GB · Preto', categoria: 'Celulares', preco: 5499, precoOriginal: 6199, badge: 'TOP VENDAS',
    img: 'https://images.unsplash.com/photo-1592286927505-1def25115558?w=900&q=85',
    descricao: 'Chip A16 Bionic, câmera 48MP, conector USB-C. Lacrado com nota fiscal e garantia Apple.',
    estoque: 4, specs: ['128 GB', 'Chip A16 Bionic', 'USB-C', '1 ano de garantia'] },
  { id: 3, nome: 'Motorola Edge 50', sub: '256GB · Azul', categoria: 'Celulares', preco: 1899, precoOriginal: 2299, badge: 'NOVO',
    img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=900&q=85',
    descricao: 'Tela pOLED 144Hz, câmera 50MP com OIS, design ultrafino e leve.',
    estoque: 6, specs: ['256 GB / 8 GB', 'pOLED 144 Hz', 'Câmera 50 MP OIS', 'IP68'] },
  { id: 4, nome: 'Xiaomi Redmi 13', sub: '256GB · Grafite', categoria: 'Celulares', preco: 1199, precoOriginal: 1499, badge: 'OFERTA',
    img: 'https://images.unsplash.com/photo-1567581935884-3349723552ca?w=900&q=85',
    descricao: 'Bateria 5030mAh, câmera 108MP, leitor de digital lateral. Excelente custo-benefício.',
    estoque: 12, specs: ['256 GB / 8 GB', 'Câmera 108 MP', 'Bateria 5.030 mAh', 'Tela 90 Hz'] },
  { id: 5, nome: 'Capa Anti-Impacto', sub: 'Vários modelos', categoria: 'Acessórios', preco: 49, precoOriginal: 79, badge: 'OFERTA',
    img: 'https://images.unsplash.com/photo-1601593346740-925612772716?w=900&q=85',
    descricao: 'Proteção militar com bordas reforçadas. Disponível para vários modelos.',
    estoque: 30, specs: ['Bordas reforçadas', 'Padrão MIL-STD', 'Vários modelos', 'Toque suave'] },
  { id: 6, nome: 'Carregador Turbo 65W', sub: 'USB-C · GaN', categoria: 'Acessórios', preco: 119, precoOriginal: 169, badge: 'TOP VENDAS',
    img: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=900&q=85',
    descricao: 'Carregamento rápido GaN, compatível com PD e QC. Cabo USB-C de 1m incluso.',
    estoque: 18, specs: ['65 W GaN', 'PD + QC', 'Cabo incluso', 'Bivolt'] },
  { id: 7, nome: 'Fone Bluetooth Pro', sub: 'ANC · BT 5.3', categoria: 'Acessórios', preco: 159, precoOriginal: 219, badge: 'NOVO',
    img: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=900&q=85',
    descricao: 'Cancelamento ativo de ruído, bateria 30h com case. Bluetooth 5.3.',
    estoque: 14, specs: ['ANC ativo', '30 h bateria', 'BT 5.3', 'Toque sensível'] },
  { id: 8, nome: 'Película 3D Vidro', sub: 'Aplicação grátis', categoria: 'Acessórios', preco: 39, precoOriginal: null, badge: null,
    img: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=900&q=85',
    descricao: 'Cobertura total, dureza 9H. Aplicação grátis na loja.',
    estoque: 50, specs: ['Dureza 9H', 'Borda 3D', 'Aplicação grátis', 'Anti-impacto'] },
  { id: 9, nome: 'iPhone 13 Seminovo', sub: '128GB · Revisado', categoria: 'Seminovos', preco: 2799, precoOriginal: 3499, badge: 'SEMINOVO',
    img: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=900&q=85',
    descricao: 'Aparelho revisado, bateria acima de 85%. 90 dias de garantia da loja.',
    estoque: 3, specs: ['Bateria 85%+', '90 dias de garantia', 'Revisado em loja', 'Acessórios novos'] },
  { id: 10, nome: 'Galaxy A52 Seminovo', sub: '128GB · AMOLED', categoria: 'Seminovos', preco: 1199, precoOriginal: 1599, badge: 'SEMINOVO',
    img: 'https://images.unsplash.com/photo-1610792516775-01de03eae630?w=900&q=85',
    descricao: 'Tela AMOLED 6.5", excelente estado. 90 dias de garantia da loja.',
    estoque: 5, specs: ['AMOLED 6.5"', 'Câmera 64 MP', '90 dias de garantia', 'Revisado'] },
  { id: 11, nome: 'Chip TIM Pré-Pago', sub: '20GB primeiro mês', categoria: 'Serviços', preco: 25, precoOriginal: null, badge: 'TIM',
    img: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=900&q=85',
    descricao: 'Chip novo com plano pré ativado. 20GB no primeiro mês + WhatsApp ilimitado.',
    estoque: 99, specs: ['20 GB primeiro mês', 'WhatsApp ilimitado', 'Ativação grátis', 'Pré-pago'] },
  { id: 12, nome: 'Smartwatch Fit Plus', sub: 'GPS · IP68', categoria: 'Acessórios', preco: 299, precoOriginal: 449, badge: 'OFERTA',
    img: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=900&q=85',
    descricao: 'Monitor cardíaco, GPS, resistente à água. Compatível com Android e iOS.',
    estoque: 9, specs: ['GPS integrado', 'Monitor cardíaco', 'IP68', 'Bateria 7 dias'] },
];

export const CATEGORIES = ['Todos', 'Celulares', 'Acessórios', 'Seminovos', 'Serviços'];

export const HERO_SLIDES = [
  {
    eyebrow: 'OFERTA DA SEMANA',
    title: ['Plano TIM Controle', 'com 20 GB + apps'],
    sub: 'Portabilidade grátis, ativação na hora. Leve um chip novo de bônus.',
    cta: 'Falar com consultor',
    ctaHref: `https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent('Olá! Quero saber mais sobre o Plano TIM Controle.')}`,
    priceLabel: 'A PARTIR DE',
    priceMain: '49,90',
    priceSuffix: '/mês',
    pricePrefix: '12x',
    img: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=1200&q=85',
  },
  {
    eyebrow: 'LANÇAMENTO 2026',
    title: ['Os celulares mais', 'aguardados do ano.'],
    sub: 'Galaxy A55, Motorola Edge 50 e iPhone 15 com condições especiais para portabilidade.',
    cta: 'Ver lançamentos',
    ctaHref: '#produtos',
    priceLabel: 'EM ATÉ',
    priceMain: '12x',
    priceSuffix: 'sem juros',
    pricePrefix: '',
    img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=85',
  },
  {
    eyebrow: 'SEMINOVOS REVISADOS',
    title: ['iPhone 13 a partir', 'de R$ 2.799.'],
    sub: 'Aparelhos testados, bateria acima de 85% e 90 dias de garantia da loja.',
    cta: 'Ver seminovos',
    ctaHref: '#produtos',
    priceLabel: 'A PARTIR DE',
    priceMain: '2.799',
    priceSuffix: ',00',
    pricePrefix: 'R$',
    img: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=1200&q=85',
  },
];

export const TESTIMONIALS = [
  { nome: 'Marina Silveira', cidade: 'Palmital–PR', estrelas: 5, texto: 'Comprei meu A55 e instalei película de graça. Atendimento rápido e os preços melhores do que comprar online.' },
  { nome: 'Roberto Faria', cidade: 'Cantagalo–PR', estrelas: 5, texto: 'Levei meu iPhone com tela trincada e em duas horas já estava pronto. Preço justo e com nota fiscal.' },
  { nome: 'Aline Tavares', cidade: 'Palmital–PR', estrelas: 5, texto: 'Fiz a portabilidade pra TIM e ainda ganhei desconto no fone. Equipe paciente, explicaram tudo direitinho.' },
];

export const SERVICES = [
  { titulo: 'Assistência Técnica', desc: 'Troca de tela, bateria, conector e placa. Diagnóstico grátis com retorno em até 48h.', icon: 'shield', tag: 'Garantia 90 dias' },
  { titulo: 'Recargas e Pagamentos', desc: 'Recarga de qualquer operadora, contas de consumo e cartões pré-pagos.', icon: 'bolt', tag: 'Sem taxa' },
  { titulo: 'Planos TIM', desc: 'Pré, Controle e Pós. Portabilidade na hora com ativação imediata e chip de cortesia.', icon: 'signal', tag: 'Portabilidade grátis' },
  { titulo: 'Aparelhos Rurais', desc: 'Celulares e antenas amplificadoras de sinal para zona rural. Instalação consultiva.', icon: 'truck', tag: 'Cobertura ampliada' },
];
