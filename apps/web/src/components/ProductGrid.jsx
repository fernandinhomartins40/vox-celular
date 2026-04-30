import { useMemo } from 'react';
import { CATEGORIES } from '../data';
import SectionHeader from './SectionHeader';
import ProductCard from './ProductCard';

export default function ProductGrid({ products, filter, setFilter, onAdd, onOpen }) {
  const filtered = useMemo(() => {
    if (filter === 'Todos') return products;
    return products.filter(p => p.categoria === filter);
  }, [products, filter]);

  return (
    <section id="produtos" className="max-w-7xl mx-auto px-4 lg:px-8 mt-20 reveal">
      <SectionHeader eyebrow="Catálogo" title="Em destaque" sub="Os mais procurados da loja, com preço de tabela e parcelamento sem juros." />

      <div className="flex flex-wrap items-center gap-2 mb-7 -mx-1 px-1 overflow-x-auto scroll-thin">
        {CATEGORIES.map(c => {
          const active = filter === c;
          return (
            <button key={c} onClick={() => setFilter(c)}
              className={`px-4 h-9 rounded-full font-medium text-[13px] tracking-wide transition border whitespace-nowrap ${
                active
                  ? 'bg-[var(--royal-800)] text-white border-[var(--royal-800)]'
                  : 'bg-white text-zinc-700 border-[var(--line)] hover:border-[var(--royal-700)] hover:text-[var(--royal-700)]'
              }`}>
              {c}
              <span className={`ml-2 text-[11px] ${active ? 'text-white/65' : 'text-zinc-400'}`}>
                {c === 'Todos' ? products.length : products.filter(p => p.categoria === c).length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {filtered.map(p => (
          <ProductCard key={p.id} p={p} onAdd={onAdd} onOpen={onOpen} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-16 text-zinc-500">Nenhum produto nesta categoria.</div>
      )}
    </section>
  );
}
