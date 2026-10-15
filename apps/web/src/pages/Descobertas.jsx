import '../assistant.css';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { api, assetUrl } from '../lib/api';
import { readDiscoveries, updateDiscoveries } from '../lib/discoveries';
import { formatBRL } from '../utils';
import CartDrawer from '../components/CartDrawer';

export default function Descobertas() {
  const { user } = useAuth();
  const [pending, setPending] = useState(() => readDiscoveries(user));
  const [candidates, setCandidates] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [index, setIndex] = useState(0);
  const [retry, setRetry] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState(() => { try { const rows = JSON.parse(sessionStorage.getItem('vox_cart')); return Array.isArray(rows) ? rows : []; } catch { return []; } });
  useEffect(() => { sessionStorage.setItem('vox_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    let active = true;
    const selection = readDiscoveries(user);
    Promise.all([api.get('/favoritos'), selection ? api.get(`/produtos?lojaId=${encodeURIComponent(user.lojaId)}`) : Promise.resolve([])]).then(([favorites, products]) => {
      if (!active) return;
      setSaved(favorites.filter(product => ['Celulares', 'Tablets'].includes(product.categoria) || ['celular', 'tablet'].includes(product.atributosTecnicos?.tipo)));
      setCandidates(products.filter(product => selection?.ids.includes(product.id) && product.lojaId === user.lojaId));
      setError('');
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, retry]);
  const rows = pending ? candidates : saved;
  const product = rows[Math.min(index, Math.max(0, rows.length - 1))];
  async function save() {
    if (busy || !pending || !candidates.length) return;
    setBusy(true); setError(''); setMessage('');
    const succeeded = [], failed = [];
    for (const candidate of candidates) {
      try { await api.put(`/favoritos/${encodeURIComponent(candidate.id)}`, {}); succeeded.push(candidate); }
      catch (e) { failed.push(candidate.id); setError(e.message); }
    }
    const remaining = failed.length ? { ...pending, ownerId: user.id, ids: failed } : null;
    try { updateDiscoveries(remaining); } catch { /* The account remains the source of truth after a successful save. */ }
    setSaved(previous => [...succeeded, ...previous.filter(row => !succeeded.some(item => item.id === row.id))]);
    setCandidates(previous => previous.filter(row => failed.includes(row.id)));
    setPending(remaining); setIndex(0); setBusy(false);
    if (succeeded.length) setMessage(failed.length ? `${succeeded.length} descoberta(s) salva(s). Tente novamente para guardar o restante.` : 'Descobertas salvas na sua conta.');
  }
  async function buy() {
    if (busy || !product) return;
    setBusy(true); setError('');
    try {
      const current = await api.get(`/produtos/${encodeURIComponent(product.id)}?lojaId=${encodeURIComponent(user.lojaId)}`);
      if (current.lojaId !== user.lojaId || current.estoque < 1 || !Number.isFinite(current.preco) || current.preco < 0) throw new Error('Este aparelho está indisponível no momento.');
      if (cart.some(row => row.lojaId !== current.lojaId)) throw new Error('Finalize ou esvazie o carrinho da outra loja antes de continuar.');
      const refresh = previous => previous.map(row => row.id === current.id ? current : row);
      setSaved(refresh); setCandidates(refresh);
      setCart(previous => [...previous.filter(row => row.id !== current.id), { ...current, img: assetUrl(current.imgUrl), qty: Math.min(current.estoque, (previous.find(row => row.id === current.id)?.qty || 0) + 1) }]);
      setCartOpen(true);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <div className="discovery discovery-library">
    <div className="discovery-orb discovery-orb-one" aria-hidden="true" /><div className="discovery-orb discovery-orb-two" aria-hidden="true" />
    <header className="discovery-header"><Link to="/app" aria-label="Voltar ao aplicativo"><img src="/brand/icon-192.png" alt="Vox Celular" width="32" height="32" /><span>vox <small>discovery</small></span></Link><button onClick={() => setCartOpen(true)}>Carrinho ({cart.reduce((total, row) => total + row.qty, 0)})</button></header>
    <main className="discovery-main">
      <span className="discovery-library-eyebrow">{pending ? 'SÓ FALTA GUARDAR' : 'SEU UNIVERSO VOX'}</span>
      <h1 className="discovery-question">Minhas descobertas</h1>
      <p className="discovery-library-caption">{pending ? 'Finalize e leve seus matches com você.' : 'Seus aparelhos favoritos, no seu tempo.'}</p>
      {error && <div role="alert">{error}{loading === false && !product && <button onClick={() => { setLoading(true); setRetry(value => value + 1); }}>Tentar novamente</button>}</div>}
      {message && <p role="status" className="discovery-library-status">{message}</p>}
      {loading ? <p role="status" className="discovery-library-caption">Buscando suas descobertas…</p> : product ? <>
        <article key={product.id} className="discovery-product discovery-library-card"><img src={assetUrl(product.imgUrl) || '/brand/icon-192.png'} alt={product.nome} width="220" height="220" /><h2>{product.nome}</h2><strong>{formatBRL(product.preco)}</strong><p className="discovery-reason">{product.estoque > 0 ? 'Disponível na loja' : 'Sem estoque no momento'}</p>{!pending && <button className="discovery-next" disabled={busy || product.estoque < 1} onClick={buy}>Adicionar ao carrinho</button>}</article>
        <div className="discovery-library-pager"><button aria-label="Descoberta anterior" disabled={busy || index === 0} onClick={() => setIndex(value => value - 1)}>←</button><span>{Math.min(index + 1, rows.length)} de {rows.length}</span><button aria-label="Próxima descoberta" disabled={busy || index >= rows.length - 1} onClick={() => setIndex(value => value + 1)}>→</button></div>
        {pending && <button className="discovery-next discovery-library-save" disabled={busy} onClick={save}>{busy ? 'Salvando…' : 'Salvar minhas descobertas'}<span aria-hidden="true">✦</span></button>}
      </> : <div className="discovery-library-empty"><img src="/brand/discovery/icons/discover.webp" alt="" width="120" height="120" /><p>{pending ? 'Esses aparelhos não estão mais no catálogo.' : 'Seu próximo match está te esperando.'}</p></div>}
      <div className="discovery-actions"><Link className="discovery-help" to="/assistente">Fazer nova descoberta ↗</Link>{pending && <button className="discovery-adjust" disabled={busy} onClick={() => { updateDiscoveries(null); setPending(null); setIndex(0); }}>Ver minhas salvas</button>}</div>
    </main><CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={cart} setItems={setCart} />
  </div>;
}
