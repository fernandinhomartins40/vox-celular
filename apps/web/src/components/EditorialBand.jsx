import { Icon } from '../icons';
import { PHONE_DIGITS } from '../data';
import chip from '../assets/redesign/06-chip-portabilidade.webp';
export default function EditorialBand() {
  return <section className="store-container store-portability"><img src={chip} width="1262" height="1246" alt="Chip TIM" loading="lazy"/><div><h2>Traga seu número e<br/>ganhe desconto na loja.</h2><p>Portabilidade gratuita para TIM<br/>+ cupom de R$ 50.</p></div><ul><li><Icon.check />Mantendo seu número</li><li><Icon.check />Portabilidade gratuita para TIM</li><li><Icon.gift />Cupom de R$ 50 para usar na loja</li></ul><a className="store-button red" href={`https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent('Olá! Quero consultar a portabilidade para TIM e o cupom de R$ 50.')}`} target="_blank" rel="noopener noreferrer">Quero portabilidade <Icon.arrowRight /></a></section>;
}
