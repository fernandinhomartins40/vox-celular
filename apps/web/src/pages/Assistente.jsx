import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, assetUrl } from '../lib/api';
import { formatBRL } from '../utils';
import { PHONE_DIGITS } from '../data';
import CartDrawer from '../components/CartDrawer';

export default function Assistente() {
  const [step, setStep] = useState(1);
  const [needs, setNeeds] = useState({ tipo: 'celular', orcamento: '', uso: 'nao-sei', ramMinima: '', armazenamentoMinimo: '' });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState(() => { try { const saved = JSON.parse(sessionStorage.getItem('vox_cart')); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => { sessionStorage.setItem('vox_cart', JSON.stringify(cart)); }, [cart]);
  function update(field, value) { setNeeds(previous => ({ ...previous, [field]: value })); setError(''); }
  async function search(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const store = await api.get('/loja');
      const payload = { lojaId: store.id, tipo: needs.tipo, orcamento: Number(needs.orcamento), uso: needs.uso };
      for (const field of ['ramMinima', 'armazenamentoMinimo']) if (needs[field]) payload[field] = Number(needs[field]);
      setResult(await api.post('/assistente/recomendar', payload)); setStep(3);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function add(product) {
    setBusy(true); setError('');
    try {
      const rows = await api.get(`/produtos?lojaId=${encodeURIComponent(product.lojaId)}`);
      const current = rows.find(row => row.id === product.id);
      if (!current || current.estoque < 1) throw new Error('Este aparelho ficou indisponível. Atualize as opções.');
      if (current.preco > Number(needs.orcamento)) throw new Error('O preço mudou e ultrapassa seu orçamento. Atualize as opções.');
      const attributes = current.atributosTecnicos || {};
      const type = attributes.tipo || ({ Celulares: 'celular', Tablets: 'tablet' })[current.categoria];
      if (type !== needs.tipo) throw new Error('O cadastro deste aparelho mudou. Atualize as opções.');
      for (const [requirement, attribute] of [['ramMinima', 'ramGB'], ['armazenamentoMinimo', 'armazenamentoGB']]) {
        if (needs[requirement] && (!attributes.verificado || !attributes.fonte || !attributes[attribute] || attributes[attribute] < Number(needs[requirement]))) {
          throw new Error('As informações técnicas mudaram e não confirmam seus critérios. Atualize as opções.');
        }
      }
      if (cart.some(item => item.lojaId !== current.lojaId)) throw new Error('Finalize ou esvazie o carrinho da outra loja antes de continuar.');
      setResult(previous => ({ ...previous, resultados: previous.resultados.map(row => row.produto.id === current.id ? { ...row, produto: current } : row) }));
      setCart(previous => [...previous.filter(item => item.id !== current.id), { ...current, img: assetUrl(current.imgUrl), qty: Math.min(current.estoque, (previous.find(item => item.id === current.id)?.qty || 0) + 1) }]);
      setCartOpen(true);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const fieldClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 p-3 mt-2 text-base';
  const primaryClass = 'rounded-xl bg-blue-700 text-white px-5 py-3 font-semibold disabled:opacity-50';
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="bg-white border-b border-slate-200"><div className="max-w-6xl mx-auto p-4 flex items-center justify-between gap-3"><Link to="/" aria-label="Voltar à loja Vox"><img src="/brand/icon-192.png" alt="Vox Celular" width="48" height="48" /></Link><Link to="/area-cliente/favoritos" className="text-blue-700">Meus favoritos</Link><button className="text-blue-700 min-h-11" onClick={() => setCartOpen(true)}>Carrinho ({cart.reduce((total, item) => total + item.qty, 0)})</button></div></header>
    <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold">Encontre seu próximo aparelho</h1><p className="mt-2 text-slate-600">Conte o que precisa. Compare até três opções reais da Vox.</p>
      <ol aria-label="Etapas da escolha" className="flex flex-wrap gap-4 my-6 text-sm">{['Seu orçamento', 'O que você precisa', 'Compare e escolha'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={step === index + 1 ? 'font-bold text-blue-700' : 'text-slate-500'}>{index + 1}. {label}</li>)}</ol>
      {error && <p role="alert" className="rounded-xl bg-red-50 text-red-800 p-4 mb-4">{error}</p>}
      <h2 ref={heading} tabIndex={-1} className="text-xl font-bold mb-4">{step === 1 ? 'Quanto deseja gastar?' : step === 2 ? 'Como você vai usar?' : 'Suas opções'}</h2>
      {step < 3 ? <form className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-8 max-w-2xl" onSubmit={step === 1 ? event => { event.preventDefault(); setStep(2); } : search}>
        {step === 1 ? <div className="grid gap-5"><label>O que procura?<select className={fieldClass} value={needs.tipo} onChange={e => update('tipo', e.target.value)}><option value="celular">Celular</option><option value="tablet">Tablet</option></select></label><label>Valor máximo em reais<input className={fieldClass} type="number" inputMode="decimal" min="1" max="100000" step="0.01" required value={needs.orcamento} onChange={e => update('orcamento', e.target.value)} placeholder="Ex.: 2000" /></label><p className="text-sm text-slate-500">Vamos respeitar esse limite. Você poderá alterá-lo depois.</p></div>
          : <div className="grid gap-5"><label>Uso principal<select className={fieldClass} value={needs.uso} onChange={e => update('uso', e.target.value)}><option value="nao-sei">Não sei ainda</option><option value="dia-a-dia">Mensagens e tarefas do dia a dia</option><option value="trabalho">Trabalho e arquivos</option><option value="jogos">Jogos</option></select></label><p className="text-sm text-slate-500">Para jogos, mostramos RAM conferida quando houver. Não garantimos desempenho de jogos específicos.</p><details><summary className="cursor-pointer py-3 text-blue-700">Já sabe a memória que precisa? (opcional)</summary><div className="grid sm:grid-cols-2 gap-4 mt-3">{[['ramMinima', 'RAM mínima', [4, 6, 8, 12, 16]], ['armazenamentoMinimo', 'Armazenamento mínimo', [64, 128, 256, 512]]].map(([field, label, values]) => <label key={field}>{label}<select className={fieldClass} value={needs[field]} onChange={e => update(field, e.target.value)}><option value="">Não sei / qualquer</option>{values.map(value => <option key={value} value={value}>{value} GB</option>)}</select></label>)}</div><p className="text-sm mt-3 text-slate-500">Se definir um mínimo, só entram aparelhos com essa informação conferida pela loja.</p></details></div>}
        <div className="flex flex-wrap gap-4 mt-6">{step === 2 && <button type="button" disabled={busy} onClick={() => setStep(1)} className="px-4 py-3 text-blue-700">Voltar</button>}<button disabled={busy} className={primaryClass}>{busy ? 'Consultando o catálogo…' : step === 1 ? 'Continuar' : 'Mostrar opções'}</button></div>
      </form> : <>
        <p className="text-sm text-slate-600 mb-4">{result?.aviso}</p>
        {result?.catalogoLimitado && <p className="mb-4 text-sm">Analisamos até 500 produtos, começando pelos menores preços. Há mais opções no catálogo.</p>}
        {!result?.resultados.length && <div className="bg-white p-6 border border-slate-200 rounded-2xl"><p>{result?.mensagem}</p><p className="mt-2 text-sm text-slate-600">Nenhum critério foi ampliado automaticamente. A loja pode ainda não ter conferido os dados técnicos que você pediu.</p></div>}
        <div className="grid gap-4 md:grid-cols-3">{result?.resultados.map(row => <article key={row.produto.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col"><img src={assetUrl(row.produto.imgUrl) || '/brand/icon-192.png'} alt={row.produto.nome} width="220" height="220" className="h-44 w-full object-contain mb-4" /><h3 className="font-bold text-lg">{row.produto.nome}</h3><p className="text-sm text-slate-500">{row.produto.sub}</p><strong className="text-xl my-3">{formatBRL(row.produto.preco)}</strong><ul className="list-disc pl-5 text-sm space-y-2 mb-4">{row.motivos.map(reason => <li key={reason}>{reason}</li>)}</ul><p className="text-sm text-slate-500 mb-3">{row.observacao}</p>{row.fonte && <a className="text-sm text-blue-700 underline mb-4" href={row.fonte} target="_blank" rel="noopener noreferrer">Fonte conferida pela loja</a>}<button disabled={busy} className={`${primaryClass} mt-auto`} onClick={() => add(row.produto)}>Adicionar ao carrinho</button></article>)}</div>
        {result?.resultados.length > 0 && <section aria-label="Comparação de aparelhos" className="mt-6"><h3 className="font-bold text-lg mb-3">Compare as informações conferidas</h3><div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl" tabIndex={0}><table className="w-full text-sm"><caption className="p-4 text-left">Dados técnicos não conferidos aparecem como não informados.</caption><thead><tr><th className="text-left p-4">Informação</th>{result.resultados.map(row => <th key={row.produto.id} className="text-left p-4 min-w-40">{row.produto.nome}</th>)}</tr></thead><tbody>{[['RAM', 'ramGB', 'GB'], ['Armazenamento', 'armazenamentoGB', 'GB'], ['Bateria', 'bateriaMah', 'mAh']].map(([label, field, unit]) => <tr key={field} className="border-t border-slate-200"><th className="text-left p-4">{label}</th>{result.resultados.map(({ produto }) => <td key={produto.id} className="p-4">{produto.atributosTecnicos?.verificado && produto.atributosTecnicos[field] ? `${produto.atributosTecnicos[field]} ${unit}` : 'Não informado'}</td>)}</tr>)}</tbody></table></div></section>}
        <div className="flex flex-wrap gap-4 mt-6"><button className={primaryClass} disabled={busy} onClick={() => { setStep(1); setError(''); }}>Ajustar escolhas</button><a className="text-blue-700 px-4 py-3" href={`https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent('Olá! Preciso de ajuda para escolher meu próximo aparelho.')}`} target="_blank" rel="noopener noreferrer">Pedir ajuda à Vox</a><Link className="text-blue-700 px-4 py-3" to="/#produtos">Ver catálogo completo</Link></div>
      </>}
    </main>
    <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={cart} setItems={setCart} />
  </div>;
}
