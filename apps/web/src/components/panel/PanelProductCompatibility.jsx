import { useEffect, useRef, useState } from 'react';
import { api, getSessionGeneration } from '../../lib/api';
export default function PanelProductCompatibility({ product, products }) {
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scope = useRef(null);
  const noteInput = useRef(null);
  useEffect(() => {
    const current = { active: true, generation: getSessionGeneration(), busy: false }; scope.current = current;
    api.get(`/compatibilidades/admin?produtoId=${encodeURIComponent(product.id)}`).then(data => { if (current.active) setRows(data); }).catch(e => { if (current.active) setError(e.message); });
    return () => { current.active = false; };
  }, [product.id]);
  const accessory = product.atributosTecnicos?.tipo === 'acessorio';
  const candidates = products.filter(row => row.ativo && row.id !== product.id && (accessory ? ['celular', 'tablet'].includes(row.atributosTecnicos?.tipo) : row.atributosTecnicos?.tipo === 'acessorio'));
  function review(row) {
    const relatedId = accessory ? row.aparelho.id : row.acessorio.id;
    if (busy || !candidates.some(candidate => candidate.id === relatedId)) return;
    setSelected(relatedId); setNote(row.observacao); setError(''); noteInput.current?.focus();
  }
  async function change(removeId) {
    const current = scope.current;
    if (!current?.active || current.busy || current.generation !== getSessionGeneration()) return;
    current.busy = true; setBusy(true); setError('');
    const active = () => current.active && current.generation === getSessionGeneration();
    try {
      if (removeId) await api.delete(`/compatibilidades/${encodeURIComponent(removeId)}`);
      else await api.put('/compatibilidades', { acessorioId: accessory ? product.id : selected, aparelhoId: accessory ? selected : product.id, observacao: note.trim() });
      const data = await api.get(`/compatibilidades/admin?produtoId=${encodeURIComponent(product.id)}`);
      if (active()) { setRows(data); setSelected(''); setNote(''); }
    } catch (e) { if (active()) setError(e.message); }
    finally { current.busy = false; if (active()) setBusy(false); }
  }
  return <details className="mt-4 rounded-xl border border-slate-200 p-4"><summary className="font-semibold cursor-pointer">Compatibilidade com outros produtos</summary><p className="panel-muted my-3">Use os tipos e atributos já salvos. Confira o encaixe ou funcionamento antes de aprovar. Alterações técnicas podem exigir nova conferência.</p>
    {error && <p role="alert" className="panel-account-error">{error}</p>}
    {rows === null ? !error && <p role="status">Consultando relações…</p> : rows.map(row => <div key={row.id} className="border-b border-slate-200 py-3"><p>{row.acessorio.nome} · {row.aparelho.nome}</p><p className="panel-muted">{row.observacao}</p><p className="text-sm">{row.atual ? 'Conferência atual' : 'Oculta na loja: confira novamente ou remova'}</p>{candidates.some(candidate => candidate.id === (accessory ? row.aparelho.id : row.acessorio.id)) && <button type="button" disabled={busy} onClick={() => review(row)} className="panel-secondary-button mt-2 mr-2">Revisar conferência</button>}<button type="button" disabled={busy} onClick={() => change(row.id)} className="panel-secondary-button mt-2">Remover relação</button></div>)}
    {['acessorio', 'celular', 'tablet'].includes(product.atributosTecnicos?.tipo) ? <div className="mt-3 grid gap-3"><label>Produto relacionado<select value={selected} disabled={busy} onChange={event => setSelected(event.target.value)} className="block w-full min-h-11 border rounded-xl p-3"><option value="">Escolha um produto</option>{candidates.map(row => <option key={row.id} value={row.id}>{row.nome}</option>)}</select></label><label>O que foi conferido<textarea ref={noteInput} value={note} disabled={busy} maxLength={500} onChange={event => setNote(event.target.value)} className="block w-full border rounded-xl p-3" /></label><button type="button" disabled={busy || !selected || note.trim().length < 2} onClick={() => change()} className="panel-primary-button">{busy ? 'Salvando…' : 'Aprovar compatibilidade'}</button></div> : <p className="panel-muted mt-3">Salve o tipo Acessório, Celular ou Tablet nas características técnicas antes de cadastrar relações.</p>}
  </details>;
}
