import { useState, useEffect, useRef } from 'react';
import { Icon } from '../icons';
import { PHONE_DIGITS } from '../data';
import { formatBRL, badgeStyle } from '../utils';
import { api } from '../lib/api';
import { useAuth } from '../auth/useAuth';
import { Link } from 'react-router-dom';

export default function ProductModal(props) {
  if (!props.product) return null;
  return <ProductModalContent key={props.product.id} {...props} />;
}

function ProductModalContent({ product, onClose, onAdd }) {
  const { user } = useAuth();
  const [favoriteMessage, setFavoriteMessage] = useState('');
  const [savingFavorite, setSavingFavorite] = useState(false);
  async function saveFavorite() {
    setSavingFavorite(true); setFavoriteMessage('');
    try { await api.put(`/favoritos/${encodeURIComponent(product.id)}`, {}); setFavoriteMessage('Salvo nos seus favoritos.'); }
    catch (error) { setFavoriteMessage(error.message); }
    finally { setSavingFavorite(false); }
  }
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const closeTimer = useRef(null);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const discount = product.precoOriginal ? Math.round((1 - product.preco / product.precoOriginal) * 100) : 0;

  const handleAdd = () => {
    if (product.estoque <= 0) return;
    onAdd(product, qty);
    setAdded(true);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => { setAdded(false); onClose(); }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden grid sm:grid-cols-2">
        <div className="relative aspect-square sm:aspect-auto bg-[var(--paper)]">
          <img src={product.img || '/brand/icon-192.png'} alt={product.nome} className="absolute inset-0 w-full h-full object-cover"/>
          {product.badge && (
            <div className={`absolute top-4 left-4 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-display font-bold tracking-[0.18em] ${badgeStyle(product.badge)}`}>
              {product.badge}
            </div>
          )}
          <button onClick={onClose} className="sm:hidden absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 grid place-items-center shadow">
            <Icon.close className="w-5 h-5" />
          </button>
        </div>

        <div className="p-7 sm:p-8 overflow-y-auto">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="font-display text-[10px] font-semibold tracking-[0.22em] text-[var(--red-500)] uppercase mb-1">{product.categoria}</div>
              <h2 className="font-display font-bold text-[26px] sm:text-[30px] leading-tight">{product.nome}</h2>
              <div className="text-[13px] text-zinc-500 mt-1">{product.sub}</div>
            </div>
            <button onClick={onClose} className="hidden sm:grid w-9 h-9 rounded-full hover:bg-zinc-100 place-items-center shrink-0">
              <Icon.close className="w-5 h-5" />
            </button>
          </div>

          <p className="text-[14px] text-zinc-600 leading-relaxed mb-5 mt-3">{product.descricao}</p>
          {user?.role === 'CLIENTE' ? <button disabled={savingFavorite} onClick={saveFavorite} className="text-blue-700 underline mb-3">{savingFavorite ? 'Salvando…' : 'Salvar nos favoritos'}</button> : <Link to="/area-cliente/login" className="text-blue-700 underline block mb-3">Entrar para salvar favoritos</Link>}
          {favoriteMessage && <p role="status" className="text-sm mb-3">{favoriteMessage} <Link to="/area-cliente/favoritos" className="underline">Ver favoritos</Link></p>}

          <div className="grid grid-cols-2 gap-2 mb-6">
            {(product.specs ?? []).map((s, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-[12px] font-medium text-zinc-700">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--royal-700)] shrink-0"></span>
                {s}
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--line)] pt-5">
            <div className="flex items-baseline gap-2 mb-1">
              {product.precoOriginal && <span className="price-old text-[14px]">{formatBRL(product.precoOriginal)}</span>}
              {discount > 0 && <span className="bg-[var(--red-500)] text-white text-[10px] font-display font-bold px-2 py-0.5 rounded">-{discount}%</span>}
            </div>
            <div className="price font-bold text-[40px] text-[var(--ink)] leading-none mb-2">{formatBRL(product.preco)}</div>
            <div className="text-[12px] text-zinc-600 mb-5">
              ou <span className="font-semibold text-[var(--royal-700)]">12x de {formatBRL(product.preco / 12)}</span> sem juros
            </div>

            <div className="flex items-stretch gap-3">
              <div className="inline-flex items-center border border-[var(--line)] rounded-full overflow-hidden">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-11 h-12 grid place-items-center hover:bg-zinc-50">
                  <Icon.minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-display font-bold">{qty}</span>
                <button onClick={() => setQty(q => Math.min(product.estoque, q + 1))} className="w-11 h-12 grid place-items-center hover:bg-zinc-50">
                  <Icon.plus className="w-4 h-4" />
                </button>
              </div>
              <button onClick={handleAdd} disabled={product.estoque <= 0}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 rounded-full font-semibold tracking-wide transition text-[14px] ${
                  added ? 'bg-emerald-600 text-white' : 'bg-[var(--royal-700)] hover:bg-[var(--royal-800)] text-white'
                }`}>
                {added ? <><Icon.check className="w-5 h-5" /> Adicionado</> : <>Adicionar — {formatBRL(product.preco * qty)}</>}
              </button>
            </div>

            <a href={`https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent(`Olá! Tenho interesse em: ${product.nome} (${formatBRL(product.preco)})`)}`}
              target="_blank" rel="noopener"
              className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 h-11 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-full font-semibold text-[13px] tracking-wide transition">
              <Icon.whatsapp className="w-4 h-4" />
              Tirar dúvida pelo WhatsApp
            </a>

            <div className="text-[11px] text-zinc-500 text-center mt-3">
              {product.estoque <= 5 ? `Apenas ${product.estoque} em estoque` : `${product.estoque} unidades em estoque`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
