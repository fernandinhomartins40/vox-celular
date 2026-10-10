import { useStoreContent } from './storeContent';
import { Icon } from '../icons';
export default function EditorialBand() {
 const p = useStoreContent('portability'); const contact = useStoreContent('contact');
  return <section className="store-container store-portability"><img src={p.image} width="1262" height="1246" alt="Chip TIM" loading="lazy"/><div><h2>{p.title}</h2><p>{p.subtitle}</p></div><ul>{p.items.map((item, i) => <li key={i}><Icon.check />{item}</li>)}</ul><a className="store-button red" href={`https://wa.me/${contact.phone}?text=${encodeURIComponent(p.message)}`} target="_blank" rel="noopener noreferrer">{p.button} <Icon.arrowRight /></a></section>;
}
