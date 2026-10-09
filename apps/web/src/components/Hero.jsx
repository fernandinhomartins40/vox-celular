import { Icon } from '../icons';
import { PHONE_DIGITS } from '../data';
import background from '../assets/redesign/01-fundo-hero.webp';
import phones from '../assets/redesign/02-celulares-hero.webp';
export default function Hero({ config }) {
  return <section id="home" className="store-hero" style={{ backgroundImage: `url(${background})` }}>
    <div className="store-hero-inner">
      <div className="hero-copy"><i /><h1>{config?.heroSlide1Titulo && config.heroSlide1Titulo !== 'Plano TIM Controle com 20 GB + apps' ? config.heroSlide1Titulo : <>Seu próximo celular.<br/>Seu atendimento<br/>de confiança.</>}</h1><p>{config?.heroSlide1Sub && config.heroSlide1Sub !== 'Portabilidade grátis, ativação na hora.' ? config.heroSlide1Sub : <>Celulares, acessórios e soluções para você,<br className="desktop-break"/> no centro de Palmital.</>}</p></div>
      <img className="hero-phones" src={phones} width="1536" height="1024" fetchPriority="high" alt="Celulares sobre uma base de exposição" />
      <div className="hero-caption"><strong>Design.</strong><span>Desempenho.<br/>Sempre à frente.</span><i /></div>
      <div className="hero-actions"><a className="store-button red" href="#produtos">Escolher meu celular <Icon.arrowRight /></a><a className="store-button outline" href={`https://wa.me/${PHONE_DIGITS}`} target="_blank" rel="noopener noreferrer"><Icon.whatsapp /> Falar com a Vox</a></div>
      {config?.heroSlide1Preco && config.heroSlide1Preco !== '49,90' && <span className="hero-price-note">Oferta em destaque: R$ {config.heroSlide1Preco}</span>}
    </div>
  </section>;
}
