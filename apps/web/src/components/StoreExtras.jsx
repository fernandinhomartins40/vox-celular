import { useStoreContent } from './storeContent';
import { Icon } from '../icons';
import { Link } from 'react-router-dom';

const wa = (message, phone) => `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
export function Benefits() {
  const { items } = useStoreContent('benefits'); const c = useStoreContent('contact');
  return <div className="store-benefits store-container">{items.map(({icon, title, sub}) => { const I = Icon[icon] || Icon.arrowRight; return <a key={title} href={wa(`Olá! Quero saber sobre: ${title}`, c.phone)} target="_blank" rel="noopener noreferrer"><span className="benefit-icon"><I /></span><div><strong>{title}</strong><small>{sub}</small></div><Icon.arrowRight className="benefit-arrow" /></a>; })}</div>;
}
export function BuyingSteps({ mobile = false }) {
  const s = useStoreContent('steps'); const steps = s.items;
  return <section className={`store-steps store-container ${mobile ? 'steps-mobile' : 'steps-desktop'}`}><div><h2>{s.title}</h2><p>{s.subtitle}</p></div><div className="steps-list">{steps.map(({ title, text, href }, i) => <a key={title} href={href}><b>{i + 1}</b><div><strong>{title}</strong><small>{text}</small></div><Icon.arrowRight /></a>)}</div></section>;
}
export function MobileNav() {
  const { items: links } = useStoreContent('navigation');
  return <nav className="store-bottom-nav" aria-label="Navegação inferior">{links.map(({ icon, label, href }) => { const I = Icon[icon] || Icon.arrowRight; const content = <><I /><span>{label}</span></>; return href.startsWith('/') ? <Link key={label} to={href}>{content}</Link> : <a key={label} href={href}>{content}</a>; })}</nav>;
}
