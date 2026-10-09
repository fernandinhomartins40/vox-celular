import { useMemo } from 'react';
import { Icon } from '../icons';
import { PHONE_DIGITS } from '../data';
import { formatBRL } from '../utils';

export default function CartDrawer({ open, onClose, items, setItems }) {
  const total = useMemo(() => items.reduce((sum, it) => sum + it.preco * it.qty, 0), [items]);

  const updateQty = (id, delta) => {
    setItems(prev => prev
      .map(it => it.id === id ? { ...it, qty: Math.min(it.estoque, Math.max(0, it.qty + delta)) } : it)
      .filter(it => it.qty > 0));
  };

  const remove = (id) => setItems(prev => prev.filter(it => it.id !== id));

  const checkoutUrl = useMemo(() => {
    if (items.length === 0) return '#';
    const lines = items.map(it => `• ${it.qty}x ${it.nome} — ${formatBRL(it.preco * it.qty)}`).join('\n');
    const text = `Olá Vox Celular! Quero finalizar o pedido:\n\n${lines}\n\n*Total: ${formatBRL(total)}*\n\nPago via:`;
    return `https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent(text)}`;
  }, [items, total]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <aside className="drawer-in absolute right-0 top-0 h-full w-full sm:w-[460px] bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[var(--line)]">
          <div>
            <div className="font-display text-[10px] tracking-[0.25em] text-[var(--red-500)] font-bold uppercase">Seu pedido</div>
            <div className="font-display font-bold text-[26px] leading-none mt-1">Carrinho ({items.length})</div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-zinc-100 grid place-items-center">
            <Icon.close className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto drawer-scroll p-5 space-y-3">
          {items.length === 0 && (
            <div className="text-center py-20 text-zinc-500">
              <div className="w-16 h-16 mx-auto rounded-full bg-zinc-100 grid place-items-center mb-4">
                <Icon.cart className="w-7 h-7 text-zinc-400"/>
              </div>
              <div className="font-display font-bold text-[18px] text-zinc-700">Seu carrinho está vazio</div>
              <div className="text-[13px] mt-1">Adicione produtos para finalizar via WhatsApp.</div>
            </div>
          )}
          {items.map(it => (
            <div key={it.id} className="flex gap-3 p-3 border border-[var(--line)] rounded-xl bg-white">
              <div className="w-20 h-20 rounded-lg bg-[var(--paper)] overflow-hidden shrink-0">
                <img src={it.img} alt="" className="w-full h-full object-cover"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-[14px] leading-tight truncate">{it.nome}</div>
                <div className="text-[11px] text-zinc-500 mb-2">{it.sub}</div>
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center border border-[var(--line)] rounded-full overflow-hidden">
                    <button onClick={() => updateQty(it.id, -1)} className="w-7 h-7 grid place-items-center hover:bg-zinc-100">
                      <Icon.minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center font-display font-bold text-[13px]">{it.qty}</span>
                    <button onClick={() => updateQty(it.id, 1)} className="w-7 h-7 grid place-items-center hover:bg-zinc-100">
                      <Icon.plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="font-display font-bold text-[14px]">{formatBRL(it.preco * it.qty)}</div>
                </div>
              </div>
              <button onClick={() => remove(it.id)} className="self-start text-zinc-400 hover:text-[var(--red-500)] p-1">
                <Icon.trash className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-[var(--line)] bg-[var(--paper)]">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[13px] text-zinc-600">Subtotal</span>
              <span className="font-display font-bold text-[14px]">{formatBRL(total)}</span>
            </div>
            <div className="flex items-baseline justify-between mb-4">
              <span className="font-display font-bold text-[18px]">Total</span>
              <span className="price font-bold text-[32px] text-[var(--ink)]">{formatBRL(total)}</span>
            </div>
            <a href={checkoutUrl} target="_blank" rel="noopener"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-semibold text-[15px] tracking-wide transition">
              <Icon.whatsapp className="w-5 h-5" />
              Finalizar via WhatsApp
            </a>
            <div className="text-[11px] text-zinc-500 text-center mt-3">
              Você será redirecionado para confirmar o pedido com nossa equipe.
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
