import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getSessionGeneration } from '../../lib/api';
import { PanelPageHeader } from '../../components/panel/PanelShell';
const empty = { titulo: '', resumo: '', texto: '', fonte: '', revisadoEm: '', validoAte: '', publicado: false };
const localDate = value => { const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
export default function AdminNovidades() {
  const [rows, setRows] = useState(null);
  const [checkedAt, setCheckedAt] = useState(0);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  const operation = useRef(null);
  useEffect(() => {
    let active = true;
    api.get('/novidades/admin').then(data => { if (active) { setRows(data); setCheckedAt(Date.now()); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; operation.current = null; };
  }, [reload]);
  function edit(row) {
    if (busy) return;
    setEditing(row?.id || 'new'); setError(''); setMessage('');
    setForm(row ? { ...row, revisadoEm: localDate(row.revisadoEm), validoAte: localDate(row.validoAte) } : { ...empty, revisadoEm: localDate(new Date().toISOString()) });
  }
  async function archive(row) {
    if (operation.current || !window.confirm(row.arquivado ? 'Restaurar esta novidade como rascunho?' : 'Arquivar esta novidade e ocultá-la da loja? O texto será preservado.')) return;
    const token = Symbol(); operation.current = token; const generation = getSessionGeneration();
    const active = () => operation.current === token && generation === getSessionGeneration();
    setBusy(true); setError('');
    try {
      await api.post(`/novidades/${encodeURIComponent(row.id)}/arquivo`, { arquivado: !row.arquivado, versaoEsperada: row.versao });
      if (active()) { setEditing(null); setRows(null); setMessage(row.arquivado ? 'Restaurada como rascunho.' : 'Novidade arquivada.'); setReload(value => value + 1); }
    } catch (e) { if (active()) setError(e.message); }
    finally { if (active()) { operation.current = null; setBusy(false); } }
  }
  async function save(event) {
    event.preventDefault(); if (operation.current) return;
    const token = Symbol(); operation.current = token; const generation = getSessionGeneration();
    const active = () => operation.current === token && generation === getSessionGeneration();
    setBusy(true); setError('');
    try {
      const body = { titulo: form.titulo, resumo: form.resumo, texto: form.texto, fonte: form.fonte, publicado: form.publicado, revisadoEm: new Date(form.revisadoEm).toISOString(), validoAte: new Date(form.validoAte).toISOString() };
      if (editing === 'new') await api.post('/novidades', body); else await api.put(`/novidades/${encodeURIComponent(editing)}`, { ...body, versaoEsperada: form.versao });
      if (active()) { setMessage(form.publicado ? 'Novidade publicada.' : 'Rascunho salvo.'); setEditing(null); setRows(null); setReload(value => value + 1); }
    } catch (e) { if (active()) setError(e.message); }
    finally { if (active()) { operation.current = null; setBusy(false); } }
  }
  return <div><PanelPageHeader title="Novidades" description="Prepare, revise e publique conteúdo da sua loja." /><div className="panel-filter-bar"><button type="button" className="panel-primary-button" disabled={busy} onClick={() => edit(null)}>Nova novidade</button><Link to="/novidades" className="panel-secondary-button">Ver página pública</Link></div>
    {error && <><p role="alert" className="panel-account-error">{error}</p><button type="button" disabled={busy} onClick={() => { setEditing(null); setForm(empty); setError(''); setRows(null); setReload(value => value + 1); }} className="panel-secondary-button my-3">Descartar formulário e carregar versão atual</button></>}{message && <p role="status" className="panel-account-success">{message}</p>}
    {editing && <form onSubmit={save} aria-label="Editar novidade" className="my-5 rounded-2xl border border-slate-200 bg-white p-5"><fieldset disabled={busy} className="grid gap-4"><legend className="font-semibold mb-4">Conteúdo e revisão</legend>{[['titulo', 'Título', 120], ['resumo', 'Resumo', 500], ['texto', 'Texto da novidade', 10000], ['fonte', 'Fonte HTTPS', 2000]].map(([key, label, limit]) => <label key={key}>{label}{key === 'texto' || key === 'resumo' ? <textarea required minLength={key === 'texto' ? 10 : 5} maxLength={limit} rows={key === 'texto' ? 8 : 3} value={form[key]} onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))} className="block w-full rounded-xl border p-3" /> : <input required type={key === 'fonte' ? 'url' : 'text'} minLength={2} maxLength={limit} value={form[key]} onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))} className="block w-full min-h-11 rounded-xl border p-3" />}</label>)}<p className="panel-muted">Horários no fuso do seu dispositivo. A publicação exige fonte HTTPS e validade futura.</p>{[['revisadoEm', 'Revisado em'], ['validoAte', 'Válido até']].map(([key, label]) => <label key={key}>{label}<input required type="datetime-local" value={form[key]} onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))} className="block w-full min-h-11 rounded-xl border p-3" /></label>)}<label className="flex gap-3"><input type="checkbox" checked={form.publicado} onChange={event => setForm(previous => ({ ...previous, publicado: event.target.checked }))} />Publicar na loja</label><details className="rounded-xl border p-4"><summary className="font-semibold">Conferir prévia do texto</summary><h2 className="mt-3 text-xl font-bold">{form.titulo}</h2><p className="my-3">{form.resumo}</p><p className="whitespace-pre-wrap break-words">{form.texto}</p></details><div className="panel-filter-bar"><button className="panel-primary-button">{busy ? 'Salvando…' : 'Salvar novidade'}</button><button type="button" onClick={() => setEditing(null)} className="panel-secondary-button">Cancelar</button></div></fieldset></form>}
    {rows === null ? !error && <p role="status">Consultando novidades…</p> : <div className="grid gap-4 md:grid-cols-2">{rows.length === 0 && <p>Nenhuma novidade cadastrada.</p>}{rows.map(row => <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">{row.titulo}</h2><p className="panel-muted my-2">{row.resumo}</p><p className="text-sm">{row.arquivado ? 'Arquivada' : !row.publicado ? 'Rascunho' : Date.parse(row.validoAte) <= checkedAt ? 'Validade vencida: oculta na loja' : 'Publicada'}</p><p className="panel-muted mt-2">Responsável pela última revisão: {row.revisadoPor?.nome || 'Não registrado'}</p>{!row.arquivado && <button type="button" disabled={busy} onClick={() => edit(row)} className="panel-secondary-button mt-3 mr-2">Editar novidade</button>}<button type="button" disabled={busy} onClick={() => archive(row)} className="panel-secondary-button mt-3">{row.arquivado ? 'Restaurar rascunho' : 'Arquivar novidade'}</button></article>)}</div>}
  </div>;
}
