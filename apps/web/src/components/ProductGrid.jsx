import { useStoreContent } from './storeContent';
import { useMemo, useState } from 'react';
import { filterCatalog } from '../lib/catalog';
import SectionHeader from './SectionHeader';
import ProductCard from './ProductCard';

export default function ProductGrid({ products, filter, setFilter, onAdd, onOpen, loading = false, error = '', onRetry, search = '', setSearch = () => {} }) {
  const content = useStoreContent('products');
  const [sort, setSort] = useState('destaque');
  const [available, setAvailable] = useState(false);
  const categories = ['Todos', ...new Set(products.map(p => p.categoria)), ...(filter !== 'Todos' ? [filter] : [])].filter((c, i, all) => all.indexOf(c) === i);
  const filtered = useMemo(() => filterCatalog(products, { category: filter, search, sort, available }), [products, filter, search, sort, available]);

  return (
    <section id="produtos" className="max-w-7xl mx-auto px-4 lg:px-8 mt-20 reveal">
      <SectionHeader eyebrow="Catálogo" title={content.title} sub={content.subtitle} />

      <div className="flex flex-wrap items-center gap-2 mb-7 -mx-1 px-1 overflow-x-auto scroll-thin">
        {categories.map(c => {
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

      <div className="flex flex-wrap gap-3 mb-5">
        <input aria-label="Buscar produtos" placeholder="Buscar produto, modelo ou categoria" value={search} onChange={e => setSearch(e.target.value)} className="min-w-0 flex-1 basis-64 border rounded-xl px-4 py-3" />
        <select aria-label="Ordenar produtos" value={sort} onChange={e => setSort(e.target.value)} className="border rounded-xl px-3 py-3">
          <option value="destaque">Em destaque</option><option value="menor">Menor preço</option><option value="maior">Maior preço</option>
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} /> Disponíveis em estoque</label>
      </div>
      {loading && <p role="status" className="py-12 text-center">Carregando catálogo…</p>}
      {error && <div role="alert" className="py-8 text-center"><p>Não foi possível carregar o catálogo.</p><button onClick={onRetry} className="mt-3 underline">Tentar novamente</button></div>}
      {!loading && !error && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {filtered.map(p => (
          <ProductCard key={p.id} p={p} onAdd={onAdd} onOpen={onOpen} />
        ))}
      </div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-zinc-500">{products.length ? 'Nenhum produto corresponde aos filtros.' : 'O catálogo está sendo preparado. Fale com a loja para consultar produtos.'}
          {products.length > 0 && <button onClick={() => { setSearch(''); setFilter('Todos'); setAvailable(false); }} className="block mx-auto mt-3 underline">Limpar filtros</button>}
        </div>
      )}
    </section>
  );
}
