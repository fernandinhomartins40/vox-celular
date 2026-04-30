import { Icon } from '../icons';
import SectionHeader from './SectionHeader';

const cats = [
  { label: 'Celulares', tag: '20+ modelos', target: 'Celulares',
    img: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=900&q=85' },
  { label: 'Acessórios', tag: 'Capas, fones, cabos', target: 'Acessórios',
    img: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=900&q=85' },
  { label: 'Seminovos', tag: 'Revisados c/ garantia', target: 'Seminovos',
    img: 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=900&q=85' },
  { label: 'Serviços TIM', tag: 'Planos e portabilidade', target: 'Serviços',
    img: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=900&q=85' },
];

export default function CategoryGrid({ onPick }) {
  return (
    <section className="max-w-7xl mx-auto px-4 lg:px-8 mt-20 reveal">
      <SectionHeader eyebrow="Navegue por departamento" title="Categorias" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cats.map((c) => (
          <button key={c.label} onClick={() => onPick(c.target)}
            className="group relative overflow-hidden rounded-2xl text-left aspect-[4/5] bg-zinc-100">
            <img src={c.img} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"/>
            <div className="absolute inset-0 p-5 flex flex-col justify-end text-white">
              <div className="font-display text-[10px] tracking-[0.25em] text-white/70 mb-1">{c.tag}</div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display font-bold text-2xl sm:text-3xl leading-tight">{c.label}</h3>
                <span className="w-9 h-9 rounded-full bg-white/15 backdrop-blur grid place-items-center group-hover:bg-white group-hover:text-[var(--royal-800)] transition">
                  <Icon.arrowUpRight className="w-4 h-4"/>
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
