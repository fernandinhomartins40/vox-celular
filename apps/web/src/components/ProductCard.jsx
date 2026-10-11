import { useState } from 'react';
import { Icon } from '../icons';
import { formatBRL } from '../utils';
export default function ProductCard({ p, onAdd, onOpen }) {
  const [added, setAdded] = useState(false);
  return <article className="product-card">
    <button className="product-open" onClick={() => onOpen(p)} aria-label={`Ver detalhes de ${p.nome}`}>
      <img src={p.img || '/brand/icon-192.png'} alt={p.nome} loading="lazy" width="280" height="280" className="product-photo" />
      <div className="product-info"><h3>{p.nome}</h3><p>{p.sub}</p>{p.precoOriginal > p.preco && <span className="product-old">{formatBRL(p.precoOriginal)}</span>}<strong className="product-price">{formatBRL(p.preco)}</strong><div className="product-installments"><b>ou 12x de {formatBRL(p.preco / 12)}</b> sem juros</div></div>
    </button>
    <button className="product-add" disabled={p.estoque <= 0} onClick={() => { onAdd(p); setAdded(true); setTimeout(() => setAdded(false), 1100); }}>{added ? <Icon.check /> : <Icon.cart />}{p.estoque <= 0 ? 'Indisponível' : added ? 'Adicionado' : 'Adicionar ao carrinho'}</button>
    {p.estoque > 0 && p.estoque <= 5 && <small className="product-stock">Últimas {p.estoque} unidades</small>}
  </article>;
}
