import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, assetUrl } from '../../lib/api';
import { formatBRL } from '../../utils';
import { PanelPageHeader } from '../../components/panel/PanelShell';
import { PanelLoading, PanelError } from '../../components/panel/PanelFeedback';
import CartDrawer from '../../components/CartDrawer';

export default function ClienteFavoritos() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [cart, setCart] = useState(() => { try { const saved = JSON.parse(sessionStorage.getItem('vox_cart')); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [cartOpen, setCartOpen] = useState(false);
  useEffect(() => { sessionStorage.setItem('vox_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    let active = true;
    api.get('/favoritos').then(rows => { if (active) setProducts(rows); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  async function remove(id) {
    setBusy(true); setMessage('');
    try { await api.delete(`/favoritos/${encodeURIComponent(id)}`); setProducts(rows => rows.filter(p => p.id !== id)); setSelected(ids => ids.filter(value => value !== id)); }
    catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  }
  async function buy(product) {
    setBusy(true); setMessage('');
    try {
      // Refresh availability and price before placing the item in the cart.
      const rows = await api.get(`/produtos?lojaId=${encodeURIComponent(product.lojaId)}`);
      const current = rows.find(p => p.id === product.id);
      if (!current || current.estoque <= 0) throw new Error('Este produto está indisponível. Escolha outro favorito.');
      setProducts(previous => previous.map(p => p.id === current.id ? current : p));
      setCart(previous => {
        const item = { ...current, img: assetUrl(current.imgUrl), qty: Math.min(current.estoque, (previous.find(p => p.id === current.id)?.qty || 0) + 1) };
        return [...previous.filter(p => p.id !== current.id), item];
      });
      setCartOpen(true);
    } catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  }
  const compared = (products || []).filter(p => selected.includes(p.id));
  return <>
    <PanelPageHeader title="Meus favoritos" description="Guarde suas escolhas, compare e compre quando quiser." />
    {error ? <PanelError message={error} /> : products === null ? <PanelLoading /> : <>
      {message && <p role="alert" className="panel-feedback">{message}</p>}
      <p className="mb-4 text-sm">Selecione até três produtos para comparar. Preços e estoque são confirmados novamente na compra.</p>
      {!products.length && <div className="panel-feedback"><p>Você ainda não salvou favoritos.</p><Link className="text-blue-700 underline" to="/#produtos">Escolher produtos na loja</Link></div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map(p => <article key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5">
          <img src={assetUrl(p.imgUrl) || '/brand/icon-192.png'} alt={p.nome} width="220" height="220" loading="lazy" className="w-full h-44 object-contain mb-4" />
          <h2 className="font-bold text-lg">{p.nome}</h2><p className="text-sm text-slate-500">{p.sub}</p>
          <strong className="block my-3 text-xl">{formatBRL(p.preco)}</strong>
          <p className="text-sm mb-3">{p.estoque > 0 ? 'Disponível na loja' : 'Sem estoque no momento'}</p>
          <label className="flex gap-2 items-center mb-4"><input type="checkbox" checked={selected.includes(p.id)} disabled={!selected.includes(p.id) && selected.length >= 3} onChange={e => setSelected(ids => e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id))} /> Comparar {p.nome}</label>
          <button disabled={busy || p.estoque <= 0} onClick={() => buy(p)} className="bg-blue-700 text-white rounded-xl px-4 py-3 disabled:opacity-50 w-full">Adicionar ao carrinho</button>
          <button disabled={busy} onClick={() => remove(p.id)} className="text-blue-700 py-3 w-full">Remover dos favoritos</button>
        </article>)}
      </div>
      {compared.length > 0 && <section className="mt-8" aria-label="Comparação de favoritos">
        <h2 className="font-bold text-xl mb-4">Compare suas escolhas</h2>
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200" tabIndex={0}>
          <table className="w-full text-sm"><caption className="p-4 text-left">Informações cadastradas pela loja. Características ausentes não foram inferidas.</caption><thead><tr><th className="p-4 text-left">Informação</th>{compared.map(p => <th key={p.id} className="p-4 text-left min-w-40">{p.nome}</th>)}</tr></thead>
            <tbody>{[['Preço', p => formatBRL(p.preco)], ['Modelo / versão', p => p.sub], ['Disponibilidade', p => p.estoque > 0 ? 'Disponível' : 'Sem estoque'], ['Características', p => p.specs?.length ? p.specs.join(' · ') : 'Ainda não informadas'], ['Descrição', p => p.descricao || 'Ainda não informada']].map(([label, value]) => <tr key={label} className="border-t border-slate-200"><th className="p-4 text-left">{label}</th>{compared.map(p => <td key={p.id} className="p-4 align-top">{value(p)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </section>}
    </>}
    <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={cart} setItems={setCart} />
  </>;
}
