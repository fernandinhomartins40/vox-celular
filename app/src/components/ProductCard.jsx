import { useState } from 'react';
import { Icon } from '../icons';
import { formatBRL, formatBRLNoSym, badgeStyle } from '../utils';

export default function ProductCard({ p, onAdd, onOpen }) {
  const [added, setAdded] = useState(false);

  const handleAdd = (e) => {
    e.stopPropagation();
    onAdd(p);
    setAdded(true);
    setTimeout(() => setAdded(false), 1100);
  };

  const discount = p.precoOriginal ? Math.round((1 - p.preco / p.precoOriginal) * 100) : 0;

  return (
    <div onClick={() => onOpen(p)}
      className="product-card group cursor-pointer bg-white border border-[var(--line)] rounded-2xl overflow-hidden flex flex-col">
      <div className="relative aspect-square bg-[var(--paper)] overflow-hidden">
        <img src={p.img} alt={p.nome} className="product-img w-full h-full object-cover" />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {p.badge && (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-display font-bold tracking-[0.15em] ${badgeStyle(p.badge)}`}>
              {p.badge}
            </span>
          )}
        </div>
        {discount > 0 && (
          <div className="absolute top-3 right-3 bg-[var(--royal-800)] text-white px-2 py-1 rounded-md font-display font-bold text-[11px] tracking-wider">
            -{discount}%
          </div>
        )}
        {p.estoque <= 5 && (
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full font-medium text-[11px] text-amber-700">
            Últimas {p.estoque} unidades
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="text-[10px] font-display font-semibold text-zinc-500 tracking-[0.22em] uppercase mb-1.5">
          {p.categoria}
        </div>
        <h3 className="font-display font-bold text-[19px] leading-[1.15] text-[var(--ink)] group-hover:text-[var(--royal-700)] transition">
          {p.nome}
        </h3>
        <div className="text-[12.5px] text-zinc-500 mt-0.5 mb-4">{p.sub}</div>

        <div className="mt-auto">
          {p.precoOriginal && (
            <div className="price-old text-[13px] mb-0.5">{formatBRL(p.precoOriginal)}</div>
          )}
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-medium text-[14px] text-[var(--ink)]">R$</span>
            <span className="price font-bold text-[34px] leading-none text-[var(--ink)]">
              {formatBRLNoSym(p.preco).split(',')[0]}
            </span>
            <span className="font-display font-bold text-[16px] text-[var(--ink)]">,{formatBRLNoSym(p.preco).split(',')[1]}</span>
          </div>
          <div className="text-[12px] text-zinc-600 mt-1 mb-4">
            ou <span className="font-semibold text-[var(--royal-700)]">12x de {formatBRL(p.preco / 12)}</span> sem juros
          </div>

          <button onClick={handleAdd}
            className={`w-full inline-flex items-center justify-center gap-2 px-3 h-11 rounded-full font-medium text-[13px] tracking-wide transition ${
              added
                ? 'bg-emerald-600 text-white'
                : 'bg-[var(--royal-700)] hover:bg-[var(--royal-800)] text-white'
            }`}>
            {added ? (<><Icon.check className="w-4 h-4" /> Adicionado</>) : (<>Adicionar ao carrinho</>)}
          </button>
        </div>
      </div>
    </div>
  );
}
