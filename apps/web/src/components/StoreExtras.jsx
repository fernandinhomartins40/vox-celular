import { Icon } from '../icons';
import { Link } from 'react-router-dom';
import { PHONE_DIGITS } from '../data';
const wa = message => `https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent(message)}`;
export function Benefits() {
  const items = [['card', 'Até 12x sem juros', 'No cartão de crédito'], ['truck', 'Entrega em Palmital', 'Acima de R$ 200'], ['shield', 'Assistência com 90 dias', 'de garantia em nossos serviços'], ['refresh', 'Aceitamos seu seminovo', 'Consulte a avaliação na loja']];
  return <div className="store-benefits store-container">{items.map(([icon, title, sub]) => { const I = Icon[icon] || Icon.arrowRight; return <a key={title} href={wa(`Olá! Quero saber sobre: ${title}`)} target="_blank" rel="noopener noreferrer"><span className="benefit-icon"><I /></span><div><strong>{title}</strong><small>{sub}</small></div><Icon.arrowRight className="benefit-arrow" /></a>; })}</div>;
}
export function BuyingSteps({ mobile = false }) {
  const steps = [['Escolha o aparelho', 'Navegue pelo catálogo e encontre o seu celular.', '#produtos'], ['Confira seu pedido', 'Revise o carrinho e confirme pelo WhatsApp.', '#produtos'], ['Combine entrega ou retirada', 'Receba em Palmital ou retire na loja.', '#contato']];
  return <section className={`store-steps store-container ${mobile ? 'steps-mobile' : 'steps-desktop'}`}><div><h2>Seu novo celular em 3 passos</h2><p>Simples, rápido e do seu jeito.</p></div><div className="steps-list">{steps.map(([title, text, href], i) => <a key={title} href={href}><b>{i + 1}</b><div><strong>{title}</strong><small>{text}</small></div><Icon.arrowRight /></a>)}</div></section>;
}
export function MobileNav() {
  const links = [['home', 'Início', '#home'], ['layoutDashboard', 'Produtos', '#produtos'], ['headphones', 'Serviços', '#servicos'], ['pin', 'Loja', '#contato'], ['user', 'Minha Conta', '/area-cliente/login']];
  return <nav className="store-bottom-nav" aria-label="Navegação inferior">{links.map(([icon, label, href]) => { const I = Icon[icon]; const content = <><I /><span>{label}</span></>; return href.startsWith('/') ? <Link key={label} to={href}>{content}</Link> : <a key={label} href={href}>{content}</a>; })}</nav>;
}
