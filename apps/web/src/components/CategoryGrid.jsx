import { Icon } from '../icons';
import SectionHeader from './SectionHeader';
import phones from '../assets/redesign/03-categoria-celulares.webp';
import accessories from '../assets/redesign/04-categoria-acessorios.webp';
import used from '../assets/redesign/05-categoria-seminovos.webp';
import chip from '../assets/redesign/06-chip-portabilidade.webp';
const cats = [
  { label: 'Celulares', sub: 'Smartphones das melhores marcas', target: 'Celulares', img: phones },
  { label: 'Acessórios', sub: 'Carregadores, capas, fones e muito mais', target: 'Acessórios', img: accessories },
  { label: 'Seminovos', sub: 'Aparelhos revisados e com procedência', target: 'Seminovos', img: used },
  { label: 'Serviços TIM', sub: 'Planos, recargas e portabilidade', target: 'Serviços', img: chip },
];
export default function CategoryGrid({ onPick }) {
  return <section className="store-container store-categories"><SectionHeader title="Compre por categoria" sub="Encontre exatamente o que você precisa." /><div className="category-grid">{cats.map(c => <button key={c.label} onClick={() => onPick(c.target)} className="category-card"><img src={c.img} alt="" loading="lazy" width="1536" height="1024"/><div><h3>{c.label}</h3><p>{c.sub}</p></div><span><Icon.arrowRight /></span></button>)}</div></section>;
}
