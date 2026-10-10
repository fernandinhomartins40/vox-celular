import { useStoreContent } from './storeContent';
import { Icon } from '../icons';
import SectionHeader from './SectionHeader';

export default function CategoryGrid({ onPick }) {
 const c = useStoreContent('categories');
  return <section className="store-container store-categories"><SectionHeader title={c.title} sub={c.subtitle} /><div className="category-grid">{c.items.map(c => <button key={c.label} onClick={() => onPick(c.target)} className="category-card"><img src={c.img} alt="" loading="lazy" width="1536" height="1024"/><div><h3>{c.label}</h3><p>{c.sub}</p></div><span><Icon.arrowRight /></span></button>)}</div></section>;
}
