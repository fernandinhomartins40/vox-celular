import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { api, assetUrl } from '../lib/api';
import { filterCatalog } from '../lib/catalog';
import { formatBRL } from '../utils';
import { Icon } from '../icons';
import CartDrawer from '../components/CartDrawer';
import ProductModal from '../components/ProductModal';

export default function CustomerApp({ catalog = false }) {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [sort, setSort] = useState('destaque');
  const [selected, setSelected] = useState(null);
  const [cartOpen, setCartOpen] = useState(() => new URLSearchParams(window.location.search).get('carrinho') === '1');
  const [cart, setCart] = useState(() => { try { const value = JSON.parse(sessionStorage.getItem('vox_cart')); return Array.isArray(value) ? value : []; } catch { return []; } });
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState('');
  const operation = useRef(false);
  useEffect(() => { sessionStorage.setItem('vox_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    let active = true;
    (async () => {
      const store = await api.get('/loja');
      const rows = await api.get(`/produtos?lojaId=${encodeURIComponent(store.id)}`);
      if (!Array.isArray(rows)) throw new Error('Não foi possível consultar o catálogo.');
      if (!active) return;
      setProducts(rows.map(row => ({ ...row, img: assetUrl(row.imgUrl) })));
      try { const url = new URL('/offline-catalog.js', window.location.origin).href; const { savePublicCatalog } = await import(/* @vite-ignore */ url); if (active) savePublicCatalog(store.id, rows); } catch { /* Optional public offline copy. */ }
    })().catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);
  const filtered = useMemo(() => filterCatalog(products, { category, search, sort }), [products, category, search, sort]);
  const shown = catalog ? filtered : filterCatalog(products, { sort: 'destaque' }).slice(0, 4);
  const categories = ['Todos', ...new Set(products.map(row => row.categoria))];
  async function add(product, qty = 1) {
    if (operation.current) return;
    operation.current = true; setAdding(true); setNotice('');
    try {
      const current = await api.get(`/produtos/${encodeURIComponent(product.id)}?lojaId=${encodeURIComponent(product.lojaId)}`);
      if (current.lojaId !== product.lojaId || current.estoque < 1 || !Number.isFinite(current.preco)) throw new Error('Produto indisponível. Atualize o catálogo.');
      if (cart.some(item => item.lojaId !== current.lojaId)) throw new Error('Finalize ou esvazie o carrinho da outra loja.');
      const row = { ...current, img: assetUrl(current.imgUrl) };
      setCart(previous => { const existing = previous.find(item => item.id === row.id); return [...previous.filter(item => item.id !== row.id), { ...row, qty: Math.min(current.estoque, (existing?.qty || 0) + qty) }]; });
      setProducts(previous => previous.map(item => item.id === row.id ? row : item));
      setNotice(`${row.nome} adicionado ao carrinho.`);
    } catch (e) { setNotice(e.message); }
    finally { operation.current = false; setAdding(false); }
  }
  return <div className="customer-app-store">
    <header className="customer-app-header"><Link to="/app" aria-label="Início do aplicativo"><img src="/brand/icon-192.png" alt="Vox Celular" width="44" height="44" /><span>Vox Celular</span></Link><button aria-label="Abrir carrinho" onClick={() => setCartOpen(true)}><Icon.cart aria-hidden="true" /><span>{cart.reduce((total, item) => total + item.qty, 0)}</span></button></header>
    <main className="customer-app-main">
      <div className="customer-app-heading"><h1>{catalog ? 'Loja' : `Olá${user?.nome ? `, ${user.nome.split(' ')[0]}` : ''}!`}</h1><p>{catalog ? 'Encontre seu próximo aparelho.' : 'O que você precisa hoje?'}</p></div>
      {!catalog && <>
        <Link to="/assistente" className="customer-app-assistant"><picture className="customer-app-assistant-art"><source media="(min-width: 1024px)" srcSet="/brand/discovery/assistant-desktop.webp" /><source media="(min-width: 600px)" srcSet="/brand/discovery/assistant-tablet.webp" /><img src="/brand/discovery/assistant-mobile.webp" alt="" width="720" height="480" fetchPriority="high" /></picture><div className="customer-app-assistant-copy"><small>✦ VOX DISCOVERY</small><h2>Qual aparelho combina com você?</h2><p>Seu estilo. Seu próximo match.</p><strong>Descobrir <Icon.arrowRight aria-hidden="true" /></strong></div></Link>
        <Link to="/app/descobertas" className="customer-app-discoveries-link">✦ Minhas descobertas <span aria-hidden="true">→</span></Link>
          <div className="customer-app-shortcuts">{[['/novidades', 'Novidades', 'tag'], ['/area-cliente/servicos', 'Serviços', 'headphones'], ['/area-cliente/pedidos', 'Pedidos', 'package'], ['/area-cliente/beneficios', 'Ofertas', 'gift']].map(([to, label, icon]) => { const I = Icon[icon]; return <Link key={to} to={to}><I aria-hidden="true" /><span>{label}</span></Link>; })}</div>
      </>}
      {catalog && <div className="customer-app-filters"><label className="customer-app-search"><Icon.search aria-hidden="true" /><input aria-label="Buscar na loja do aplicativo" placeholder="Buscar aparelho ou acessório" value={search} onChange={e => setSearch(e.target.value)} /></label><div className="customer-app-categories" aria-label="Categorias">{categories.map(value => <button key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}</div><select aria-label="Ordenar catálogo do aplicativo" value={sort} onChange={e => setSort(e.target.value)}><option value="destaque">Em destaque</option><option value="menor">Menor preço</option><option value="maior">Maior preço</option></select></div>}
      {!catalog && <div className="customer-app-section-heading"><h2>Na loja</h2><Link to="/app/loja">Ver todos</Link></div>}
      {loading && <p role="status" className="customer-app-message">Carregando produtos…</p>}
      {error && <div role="alert" className="customer-app-message"><p>{error}</p><button onClick={() => { setLoading(true); setError(''); setReload(value => value + 1); }}>Tentar novamente</button></div>}
      {notice && <p role="status" className="customer-app-message">{notice}</p>}
      {!loading && !error && <div className="customer-app-products">{shown.map(product => <article className="customer-app-product" key={product.id}><button className="customer-app-product-detail" aria-label={`Ver ${product.nome}`} onClick={() => setSelected(product)}><div className="customer-app-product-image"><img src={product.img || '/brand/icon-192.png'} alt={product.nome} loading="lazy" /></div><h2>{product.nome}</h2><p>{product.sub || product.categoria}</p><strong>{formatBRL(product.preco)}</strong></button><button className="customer-app-product-add" disabled={adding || product.estoque <= 0} onClick={() => add(product)}>{product.estoque > 0 ? 'Adicionar' : 'Indisponível'}<Icon.cart aria-hidden="true" /></button></article>)}</div>}
      {!loading && !error && shown.length === 0 && <p className="customer-app-message">{products.length ? 'Nenhum produto encontrado. Ajuste sua busca.' : 'Nenhum produto publicado no momento.'}</p>}
    </main>
    <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={cart} setItems={setCart} />
    <ProductModal product={selected} onClose={() => setSelected(null)} onAdd={add} onSelect={setSelected} />
  </div>;
}
