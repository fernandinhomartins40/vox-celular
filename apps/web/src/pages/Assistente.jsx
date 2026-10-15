import '../assistant.css';
import ProductCompatibility from '../components/ProductCompatibility';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, assetUrl } from '../lib/api';
import { formatBRL } from '../utils';
import { PHONE_DIGITS } from '../data';
import CartDrawer from '../components/CartDrawer';
import { useCustomerAppMode } from '../hooks/useInstalledApp';

export default function Assistente() {
  const appMode = useCustomerAppMode();
  const [step, setStep] = useState(1);
  const [scene, setScene] = useState('type');
  const [needs, setNeeds] = useState({ tipo: 'celular', orcamento: '', uso: 'nao-sei', prioridade: 'equilibrado', ramMinima: '', armazenamentoMinimo: '' });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [externalAi, setExternalAi] = useState(false);
  const [error, setError] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState(() => { try { const saved = JSON.parse(sessionStorage.getItem('vox_cart')); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [selectedResult, setSelectedResult] = useState(0);
  const [dialogKind, setDialogKind] = useState(null);
  const dialog = useRef(null);
  useEffect(() => { if (dialogKind) dialog.current?.showModal(); else dialog.current?.close(); }, [dialogKind]);
  const heading = useRef(null);
  const addingAccessory = useRef(false);
  const screenActive = useRef(false);
  useEffect(() => { screenActive.current = true; return () => { screenActive.current = false; }; }, []);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [step, scene]);
  useEffect(() => { sessionStorage.setItem('vox_cart', JSON.stringify(cart)); }, [cart]);
  function openCart() { setDialogKind(null); setCartOpen(true); }
  function update(field, value) { setNeeds(previous => ({ ...previous, [field]: value })); setError(''); }
  async function search(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const store = await api.get('/loja');
      const payload = { lojaId: store.id, tipo: needs.tipo, orcamento: Number(needs.orcamento), uso: needs.uso, ...(needs.prioridade !== 'equilibrado' ? { prioridade: needs.prioridade } : {}) };
      for (const field of ['ramMinima', 'armazenamentoMinimo']) if (needs[field]) payload[field] = Number(needs[field]);
      setResult(await api.post(externalAi ? '/assistente/recomendar-ia' : '/assistente/recomendar', externalAi ? { necessidades: payload, autorizaProcessamentoExterno: true } : payload)); setSelectedResult(0); setStep(3);
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
      openCart();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function addAccessory(related, device) {
    if (addingAccessory.current || busy) return;
    addingAccessory.current = true; setBusy(true); setError('');
    try {
      const pairs = await api.get(`/compatibilidades?lojaId=${encodeURIComponent(device.lojaId)}&produtoId=${encodeURIComponent(device.id)}`);
      if (!pairs.some(pair => pair.aparelho.id === device.id && pair.acessorio.id === related.id)) throw new Error('A compatibilidade mudou. Consulte novamente antes de comprar.');
      const current = await api.get(`/produtos/${encodeURIComponent(related.id)}?lojaId=${encodeURIComponent(device.lojaId)}`);
      if (current.lojaId !== device.lojaId || current.estoque < 1 || !Number.isFinite(current.preco) || current.preco < 0) throw new Error('Este acessório não está disponível.');
      if (cart.some(item => item.lojaId !== current.lojaId)) throw new Error('Finalize ou esvazie o carrinho da outra loja antes de continuar.');
      if (!screenActive.current) return;
      if (!window.confirm(`Adicionar ${current.nome} por ${formatBRL(current.preco)}? O acessório é opcional e seu valor é adicional ao orçamento do aparelho. O estoque será conferido novamente ao finalizar.`)) return;
      setCart(previous => [...previous.filter(item => item.id !== current.id), { ...current, img: assetUrl(current.imgUrl), qty: Math.min(current.estoque, (previous.find(item => item.id === current.id)?.qty || 0) + 1) }]);
      openCart();
    } catch (e) { if (screenActive.current) setError(e.message); }
    finally { addingAccessory.current = false; if (screenActive.current) setBusy(false); }
  }
  const usages = [['dia-a-dia', '💬', 'Conectar', 'Meu dia a dia'], ['fotos', '📸', 'Criar', 'Fotos e vídeos'], ['jogos', '🎮', 'Jogar', 'Minha próxima partida'], ['trabalho', '💼', 'Produzir', 'Trabalho e arquivos'], ['estudos', '🎓', 'Aprender', 'Estudos'], ['redes-sociais', '✨', 'Compartilhar', 'Redes sociais']];
  const fieldClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 p-3 mt-2 text-base';
  return <div className={`discovery discovery-step-${step}`} aria-busy={busy}>
    <div className="discovery-orb discovery-orb-one" aria-hidden="true" /><div className="discovery-orb discovery-orb-two" aria-hidden="true" />
    <header className="discovery-header"><Link to={appMode ? '/app/loja' : '/'} aria-label="Voltar à loja Vox"><img src="/brand/icon-192.png" alt="Vox Celular" width="38" height="38" /><span>vox <small>discovery</small></span></Link><button onClick={openCart}>Carrinho ({cart.reduce((total, item) => total + item.qty, 0)})</button></header>
    <main className="discovery-main">
      <h1 className="sr-only">Encontre seu próximo aparelho</h1>
      <ol aria-label="Etapas da escolha" className="discovery-progress">{['Seu limite', 'Sua vibe', 'Seu match'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={step > index + 1 ? 'complete' : ''}><span>{step > index + 1 ? '✓' : `0${index + 1}`}</span>{label}</li>)}</ol>
      {error && !dialogKind && <p role="alert" className="rounded-xl bg-red-50 text-red-800 p-4 mb-4">{error}</p>}
      <h2 ref={heading} tabIndex={-1} className="discovery-question">{step === 3 ? 'Seu próximo match.' : ({ type: 'Qual vai ser seu upgrade?', budget: 'Até quanto vamos?', usage: 'O que te move?', priority: 'O que faz a diferença?' })[scene]}</h2>
      {step < 3 ? <form key={scene} className="discovery-scene" onSubmit={event => { event.preventDefault(); if (scene === 'type') setScene('budget'); else if (scene === 'budget') { setStep(2); setScene('usage'); } else if (scene === 'usage') setScene('priority'); else search(event); }}>
        {scene === 'type' && <div className="discovery-single"><div className={`discovery-device-stage discovery-device-${needs.tipo}`} aria-hidden="true"><div className="discovery-device-shadow" /><div className="discovery-device-3d"><div className="discovery-device-screen"><span>✦</span></div></div><span className="discovery-floating-spark">✦</span></div><div className="discovery-format-choices" role="group" aria-label="O que procura?">{[['celular', 'Celular'], ['tablet', 'Tablet']].map(([value, label]) => <button type="button" key={value} aria-pressed={needs.tipo === value} onClick={() => update('tipo', value)}>{label}</button>)}</div></div>}
        {scene === 'budget' && <div className="discovery-single"><div className="discovery-budget-emblem" aria-hidden="true"><span>R$</span><i>✦</i></div><div className="discovery-budget"><label htmlFor="discovery-budget">Valor máximo em reais</label><div><span aria-hidden="true">R$</span><input id="discovery-budget" type="number" inputMode="decimal" min="1" max="100000" step="0.01" required value={needs.orcamento} onChange={e => update('orcamento', e.target.value)} placeholder="Seu limite" /></div><div className="discovery-presets" aria-label="Sugestões de orçamento">{[1000, 2000, 3000, 5000].map(value => <button key={value} type="button" aria-pressed={Number(needs.orcamento) === value} onClick={() => update('orcamento', String(value))}>{formatBRL(value).replace(',00', '')}</button>)}</div></div><p className="discovery-single-caption">Seu limite é o nosso ponto de partida.</p></div>}
        {scene === 'usage' && <div className="discovery-single"><div className="discovery-emoji-stage" aria-hidden="true" key={needs.uso}><span>{usages.find(item => item[0] === needs.uso)?.[1] || '✨'}</span><i>✦</i></div><p className="discovery-single-caption">{usages.find(item => item[0] === needs.uso)?.[3] || 'Descubra no seu ritmo'}</p><div className="discovery-usage-choices" role="group" aria-label="Uso principal">{usages.map(([value, , label]) => <button key={value} type="button" aria-pressed={needs.uso === value} onClick={() => update('uso', value)}>{label}</button>)}</div><button type="button" className="discovery-unsure" aria-pressed={needs.uso === 'nao-sei'} onClick={() => update('uso', 'nao-sei')}>Ainda estou descobrindo</button></div>}
        {scene === 'priority' && <div className="discovery-single"><div className="discovery-emoji-stage" aria-hidden="true" key={needs.prioridade}><span>{({ equilibrado: '⚖️', economia: '💎', bateria: '🔋', armazenamento: '🗂️' })[needs.prioridade]}</span><i>✦</i></div><div className="discovery-priority-choices" role="group" aria-label="O que mais importa?">{[['equilibrado', 'Equilíbrio'], ['economia', 'Economia'], ['bateria', 'Bateria'], ['armazenamento', 'Espaço']].map(([value, label]) => <button key={value} type="button" aria-pressed={needs.prioridade === value} onClick={() => update('prioridade', value)}>{label}</button>)}</div><div className="discovery-refine-row"><button type="button" className="discovery-options" onClick={() => setDialogKind('options')}>Ajustes opcionais</button><label className="discovery-inline-ai"><input type="checkbox" checked={externalAi} disabled={busy} onChange={e => setExternalAi(e.target.checked)} /><span>Autorizar IA externa</span></label><button type="button" className="discovery-inline-info" onClick={() => setDialogKind('privacy')} aria-label="Como funciona a IA?">ⓘ</button></div></div>}
        <div className="discovery-actions">{scene !== 'type' && <button type="button" disabled={busy} onClick={() => { if (scene === 'budget') setScene('type'); else if (scene === 'usage') { setScene('budget'); setStep(1); } else setScene('usage'); }} className="discovery-back" aria-label="Voltar">←</button>}<button disabled={busy} className="discovery-next">{busy ? 'Buscando seu match…' : scene === 'priority' ? 'Mostrar opções' : 'Continuar'}<span aria-hidden="true"> ↗</span></button></div>
      </form> : <>
        <p className="discovery-mode">{result?.aviso}</p>

        {!result?.resultados.length && <div className="discovery-empty"><p>{result?.mensagem}</p></div>}
        <div className="discovery-results">{result?.resultados.slice(selectedResult, selectedResult + 1).map(row => <article key={row.produto.id} className="discovery-product"><img src={assetUrl(row.produto.imgUrl) || '/brand/icon-192.png'} alt={row.produto.nome} width="220" height="220" /><h3>{row.produto.nome}</h3><strong>{formatBRL(row.produto.preco)}</strong><p className="discovery-reason">{row.motivos[0]}</p><button type="button" className="discovery-details" onClick={() => setDialogKind('product')}>Por que combina comigo?</button><button disabled={busy} className="discovery-next" onClick={() => add(row.produto)}>Adicionar ao carrinho</button></article>)}</div>
        {result?.resultados.length > 1 && <div className="discovery-pager" aria-label="Alternativas do catálogo">{result.resultados.map((row, index) => <button key={row.produto.id} aria-pressed={selectedResult === index} onClick={() => setSelectedResult(index)} aria-label={`Ver opção ${index + 1}: ${row.produto.nome}`}>{index + 1}</button>)}</div>}
        <div className="discovery-actions"><button className="discovery-adjust" disabled={busy} onClick={() => { setStep(1); setScene('budget'); setError(''); setExternalAi(false); }}>Ajustar escolhas</button><a className="discovery-help" href={`https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent('Olá! Preciso de ajuda para escolher meu próximo aparelho.')}`} target="_blank" rel="noopener noreferrer">Pedir ajuda à Vox</a><Link className="discovery-help" to={appMode ? "/app/loja" : "/#produtos"}>Ver catálogo completo</Link></div>
      </>}
    </main>
    <dialog ref={dialog} className="discovery-dialog" aria-labelledby="discovery-detail-title" onCancel={() => setDialogKind(null)} onClose={() => setDialogKind(null)}><button type="button" className="discovery-dialog-close" onClick={() => setDialogKind(null)}>Fechar detalhes</button>
      {error && <p role="alert">{error}</p>}{dialogKind === 'options' && <><h2 id="discovery-detail-title">Ajustes opcionais</h2><div className="grid gap-4">{[['ramMinima', 'RAM mínima', [4, 6, 8, 12, 16]], ['armazenamentoMinimo', 'Armazenamento mínimo', [64, 128, 256, 512]]].map(([field, label, values]) => <label key={field}>{label}<select className={fieldClass} value={needs[field]} onChange={e => update(field, e.target.value)}><option value="">Qualquer</option>{values.map(value => <option key={value} value={value}>{value} GB</option>)}</select></label>)}</div><p>Só usamos especificações conferidas pela loja para atender a esses mínimos.</p></>}
      {dialogKind === 'privacy' && <><h2 id="discovery-detail-title">Um toque de IA</h2><p>Ao autorizar, suas preferências e dados dos aparelhos são enviados ao DeepSeek ou Qwen configurado pela Vox. Sem nome, telefone ou pagamento.</p><p>Sem autorização ou com IA indisponível, usamos regras do catálogo e identificamos isso no resultado.</p></>}
      {dialogKind === 'product' && result?.resultados[selectedResult] && (() => { const row = result.resultados[selectedResult]; return <><h2 id="discovery-detail-title">{row.produto.nome}</h2><ul>{row.motivos.map(reason => <li key={reason}>{reason}</li>)}</ul><p>{row.observacao}</p>{row.fonte && <a href={row.fonte} target="_blank" rel="noopener noreferrer">Fonte conferida pela loja</a>}<ProductCompatibility product={row.produto} onAddAccessory={addAccessory} disabled={busy} />{result?.resultados.length > 0 && <section aria-label="Comparação de aparelhos" className="mt-6"><h3 className="font-bold text-lg mb-3">Compare as informações conferidas</h3><div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl" tabIndex={0}><table className="w-full text-sm"><caption className="p-4 text-left">Dados técnicos não conferidos aparecem como não informados.</caption><thead><tr><th className="text-left p-4">Informação</th>{result.resultados.map(row => <th key={row.produto.id} className="text-left p-4 min-w-40">{row.produto.nome}</th>)}</tr></thead><tbody>{[['RAM', 'ramGB', 'GB'], ['Armazenamento', 'armazenamentoGB', 'GB'], ['Bateria', 'bateriaMah', 'mAh']].map(([label, field, unit]) => <tr key={field} className="border-t border-slate-200"><th className="text-left p-4">{label}</th>{result.resultados.map(({ produto }) => <td key={produto.id} className="p-4">{produto.atributosTecnicos?.verificado && produto.atributosTecnicos[field] ? `${produto.atributosTecnicos[field]} ${unit}` : 'Não informado'}</td>)}</tr>)}</tbody></table></div></section>}{result.catalogoLimitado && <p>Analisamos até 500 produtos, começando pelos menores preços.</p>}</>; })()}
    </dialog>
    <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={cart} setItems={setCart} />
  </div>;
}
