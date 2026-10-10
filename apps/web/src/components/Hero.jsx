import { useStoreContent } from './storeContent';
import { Icon } from '../icons';

export default function Hero() {
  const h = useStoreContent('hero'); const contact = useStoreContent('contact');
  return <section id="home" className="store-hero" style={{ backgroundImage: `url(${h.background})` }}>
    <div className="store-hero-inner">
      <div className="hero-copy"><i /><h1>{h.title}</h1><p>{h.subtitle}</p></div>
      <img className="hero-phones" src={h.image} width="1536" height="1024" fetchPriority="high" alt="Celulares sobre uma base de exposição" />
      <div className="hero-caption"><strong>{h.caption}</strong><span>{h.captionText}</span><i /></div>
      <div className="hero-actions"><a className="store-button red" href="#produtos">{h.primaryLabel} <Icon.arrowRight /></a><a className="store-button outline" href={`https://wa.me/${contact.phone}`} target="_blank" rel="noopener noreferrer"><Icon.whatsapp /> {h.secondaryLabel}</a></div>
      {h.price && <span className="hero-price-note">Oferta em destaque: R$ {h.price}</span>}
    </div>
  </section>;
}
