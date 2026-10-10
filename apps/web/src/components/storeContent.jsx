import { createContext, useContext } from 'react';
import { SERVICES, TESTIMONIALS, PHONE_DIGITS, PHONE_DISPLAY, ADDRESS, MAPS_URL, MAPS_EMBED } from '../data';
import phones from '../assets/redesign/02-celulares-hero.webp';
import background from '../assets/redesign/01-fundo-hero.webp';
import categoryPhones from '../assets/redesign/03-categoria-celulares.webp';
import accessories from '../assets/redesign/04-categoria-acessorios.webp';
import used from '../assets/redesign/05-categoria-seminovos.webp';
import chip from '../assets/redesign/06-chip-portabilidade.webp';

export const STORE_DEFAULTS = {
  design: { primary: '#0034c9', accent: '#ff0035', background: '#ffffff', radius: '16', font: 'DM Sans' },
  header: { brand: 'VOX', tagline: 'REPRESENTANTE TIM', search: 'O que você está procurando?', announcements: ['Até 12x sem juros no cartão', 'Assistência técnica com 90 dias de garantia', 'Representante TIM em Palmital', 'Entrega local acima de R$ 200'] },
  hero: { title: 'Seu próximo celular.\nSeu atendimento\nde confiança.', subtitle: 'Celulares, acessórios e soluções para você, no centro de Palmital.', image: phones, background, caption: 'Design.', captionText: 'Desempenho.\nSempre à frente.', primaryLabel: 'Escolher meu celular', secondaryLabel: 'Falar com a Vox', price: '' },
  benefits: { items: [ { icon: 'card', title: 'Até 12x sem juros', sub: 'No cartão de crédito' }, { icon: 'truck', title: 'Entrega em Palmital', sub: 'Acima de R$ 200' }, { icon: 'shield', title: 'Assistência com 90 dias', sub: 'de garantia em nossos serviços' }, { icon: 'refresh', title: 'Aceitamos seu seminovo', sub: 'Consulte a avaliação na loja' } ] },
  categories: { title: 'Compre por categoria', subtitle: 'Encontre exatamente o que você precisa.', items: [{ label: 'Celulares', sub: 'Smartphones das melhores marcas', target: 'Celulares', img: categoryPhones }, { label: 'Acessórios', sub: 'Carregadores, capas, fones e muito mais', target: 'Acessórios', img: accessories }, { label: 'Seminovos', sub: 'Aparelhos revisados e com procedência', target: 'Seminovos', img: used }, { label: 'Serviços TIM', sub: 'Planos, recargas e portabilidade', target: 'Serviços', img: chip }] },
  products: { title: 'Em destaque', subtitle: 'Os mais procurados da loja, com preço de tabela e parcelamento sem juros.' },
  portability: { title: 'Traga seu número e\nganhe desconto na loja.', subtitle: 'Portabilidade gratuita para TIM\n+ cupom de R$ 50.', image: chip, items: ['Mantendo seu número', 'Portabilidade gratuita para TIM', 'Cupom de R$ 50 para usar na loja'], button: 'Quero portabilidade', message: 'Olá! Quero consultar a portabilidade para TIM e o cupom de R$ 50.' },
  steps: { title: 'Seu novo celular em 3 passos', subtitle: 'Simples, rápido e do seu jeito.', items: [{ title: 'Escolha o aparelho', text: 'Navegue pelo catálogo e encontre o seu celular.', href: '#produtos' }, { title: 'Confira seu pedido', text: 'Revise o carrinho e confirme pelo WhatsApp.', href: '#produtos' }, { title: 'Combine entrega ou retirada', text: 'Receba em Palmital ou retire na loja.', href: '#contato' }] },
  services: { title: 'Mais que uma loja', subtitle: 'Resolvemos tudo do seu celular num só lugar — diagnóstico, conserto, ativação e suporte humano.', button: 'Solicitar', items: SERVICES },
  testimonials: { title: 'O que dizem nossos clientes', items: TESTIMONIALS },
  contact: { title: 'Estamos no centro de Palmital', subtitle: 'Atendimento humano, café na espera e estacionamento na porta.', address: ADDRESS, phone: PHONE_DIGITS, phoneDisplay: PHONE_DISPLAY, mapsUrl: MAPS_URL, mapsEmbed: MAPS_EMBED, formTitle: 'Mande uma mensagem', formSubtitle: 'Vamos responder pelo WhatsApp.', button: 'Enviar via WhatsApp' },
  footer: { description: 'Loja de celulares, acessórios e serviços de telefonia em Palmital–PR. Atendimento humano, preços honestos, soluções rápidas.', tagline: 'CELULAR · REPRESENTANTE TIM', copyright: '© 2026 Vox Celular · Todos os direitos reservados', representative: 'Representante TIM autorizado em Palmital–PR' },
  navigation: { items: [{ icon: 'home', label: 'Início', href: '#home' }, { icon: 'layoutDashboard', label: 'Produtos', href: '#produtos' }, { icon: 'headphones', label: 'Serviços', href: '#servicos' }, { icon: 'pin', label: 'Loja', href: '#contato' }, { icon: 'user', label: 'Minha Conta', href: '/area-cliente/login' }] },
};
export const StoreContentContext = createContext(STORE_DEFAULTS);
export const useStoreContent = section => useContext(StoreContentContext)[section];
export function resolveStoreContent(config) {
  const value = structuredClone(STORE_DEFAULTS);
  for (const key of Object.keys(value)) value[key] = { ...value[key], ...(config?.landingPage?.[key] ?? {}) };
  if (!config?.landingPage?.hero) {
    if (config?.heroSlide1Titulo && config.heroSlide1Titulo !== 'Plano TIM Controle com 20 GB + apps') value.hero.title = config.heroSlide1Titulo;
    if (config?.heroSlide1Sub && config.heroSlide1Sub !== 'Portabilidade grátis, ativação na hora.') value.hero.subtitle = config.heroSlide1Sub;
    if (config?.heroSlide1Preco && config.heroSlide1Preco !== '49,90') value.hero.price = config.heroSlide1Preco;
  }
  return value;
}
export function storeStyle(content) {
  return { '--royal-700': content.design.primary, '--royal-800': content.design.primary, '--red-500': content.design.accent, '--store-primary': content.design.primary, '--store-accent': content.design.accent, '--store-radius': `${content.design.radius}px`, '--store-background': content.design.background, fontFamily: `'${content.design.font}', sans-serif` };
}
