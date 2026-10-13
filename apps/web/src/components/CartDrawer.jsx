import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { api } from '../lib/api';
import { Icon } from '../icons';
import { PHONE_DIGITS } from '../data';
import { formatBRL } from '../utils';

export default function CartDrawer({ open, onClose, items, setItems }) {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [pedido, setPedido] = useState(null);
  async function confirmar() {
    if (pending) return;
    setPending(true); setError('');
    try {
      const signature = JSON.stringify([user.id, items.map(p => [p.id, p.qty, Math.round(p.preco * 100)])]);
      let attempt;
      try { attempt = JSON.parse(sessionStorage.getItem('vox_checkout_attempt')); } catch { /* new attempt */ }
      if (!attempt || attempt.signature !== signature) {
        attempt = { signature, key: crypto.randomUUID() };
        sessionStorage.setItem('vox_checkout_attempt', JSON.stringify(attempt));
      }
      const result = await api.post('/pedidos', { checkoutKey: attempt.key, itens: items.map(p => ({ produtoId: p.id, qty: p.qty, precoCentavos: Math.round(p.preco * 100) })) });
      setPedido(result); setItems([]); sessionStorage.removeItem('vox_checkout_attempt');
    } catch (e) { setError(e.message); }
    finally { setPending(false); }
  }
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
          <button onClick={onClose} aria-label="Fechar carrinho" className="w-10 h-10 rounded-full hover:bg-zinc-100 grid place-items-center">
            <Icon.close className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto drawer-scroll p-5 space-y-3">
          {pedido && <div role="status" className="panel-success-notice"><strong>Pedido {pedido.codigo} registrado</strong><p>Pagamento aguardando confirmação da loja.</p><Link to="/area-cliente/pedidos">Acompanhar meu pedido</Link></div>}
          {items.length === 0 && (
            <div className="text-center py-20 text-zinc-500">
              <div className="w-16 h-16 mx-auto rounded-full bg-zinc-100 grid place-items-center mb-4">
                <Icon.cart className="w-7 h-7 text-zinc-400"/>
              </div>
              <div className="font-display font-bold text-[18px] text-zinc-700">Seu carrinho está vazio</div>
              <div className="text-[13px] mt-1">Escolha os produtos para montar seu pedido.</div>
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
                    <button disabled={pending} aria-label={`Diminuir quantidade de ${it.nome}`} onClick={() => updateQty(it.id, -1)} className="w-11 h-11 grid place-items-center hover:bg-zinc-100 disabled:opacity-50">
                      <Icon.minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center font-display font-bold text-[13px]">{it.qty}</span>
                    <button disabled={pending || it.qty >= it.estoque} aria-label={`Aumentar quantidade de ${it.nome}`} onClick={() => updateQty(it.id, 1)} className="w-11 h-11 grid place-items-center hover:bg-zinc-100 disabled:opacity-50">
                      <Icon.plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="font-display font-bold text-[14px]">{formatBRL(it.preco * it.qty)}</div>
                </div>
              </div>
              <button disabled={pending} aria-label={`Remover ${it.nome}`} onClick={() => remove(it.id)} className="self-start min-w-11 min-h-11 grid place-items-center text-zinc-400 hover:text-[var(--red-500)] disabled:opacity-50">
                <Icon.trash className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-[var(--line)] bg-[var(--paper)]">
            {error && <p role="alert" className="text-red-600 mb-3">{error}</p>}
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[13px] text-zinc-600">Subtotal</span>
              <span className="font-display font-bold text-[14px]">{formatBRL(total)}</span>
            </div>
            <div className="flex items-baseline justify-between mb-4">
              <span className="font-display font-bold text-[18px]">Total</span>
              <span className="price font-bold text-[32px] text-[var(--ink)]">{formatBRL(total)}</span>
            </div>
            <p className="text-sm text-zinc-600 mb-3">Confira os itens e o total. A loja combinará o pagamento e a entrega após receber seu pedido.</p>
            {user?.role === 'CLIENTE' ? <button onClick={confirmar} disabled={pending} className="panel-primary-button w-full mb-3">{pending ? 'Registrando pedido…' : 'Confirmar pedido'}</button> : <Link to="/area-cliente/login" state={{ returnTo: '/?carrinho=1' }} className="panel-primary-button w-full mb-3">Entrar para confirmar pedido</Link>}
            <a href={checkoutUrl} target="_blank" rel="noopener"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-full font-semibold text-[15px] transition">
              <Icon.whatsapp className="w-5 h-5" />
              Preciso de ajuda pelo WhatsApp
            </a>
            <div className="text-[11px] text-zinc-500 text-center mt-3">
              O pedido será registrado após a confirmação. O pagamento será combinado com a loja.
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
