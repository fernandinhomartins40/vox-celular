import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { PanelPageHeader } from '../../components/panel/PanelShell';
import { PanelError, PanelLoading } from '../../components/panel/PanelFeedback';

const topics = { planos: 'Planos', 'saldo-consumo': 'Saldo e consumo', 'chip-esim': 'Chip e eSIM', 'internet-apn': 'Internet e APN', sinal: 'Sinal', 'chamadas-sms': 'Chamadas e mensagens', portabilidade: 'Portabilidade', 'perda-roubo': 'Perda ou roubo', aplicativos: 'Aplicativos oficiais' };
const empty = { operadora: 'TIM', topico: 'chip-esim', titulo: '', resumo: '', passos: '', fonte: '', canalOficial: '', revisadoEm: '', validoAte: '', publicado: false };
const dateInput = value => new Date(value).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
export default function AdminGuias() {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api.get('/guias/admin').then(data => { if (active) setRows(data); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  function change(field, value) { setForm(previous => ({ ...previous, [field]: value, ...(field !== 'publicado' ? { publicado: false } : {}) })); }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const payload = { ...form, passos: form.passos.split('\n').map(text => text.trim()).filter(Boolean), revisadoEm: new Date(`${form.revisadoEm}T00:00:00-03:00`).toISOString(), validoAte: new Date(`${form.validoAte}T23:59:59-03:00`).toISOString() };
      if (editing === 'new') await api.post('/guias', payload); else await api.put(`/guias/${encodeURIComponent(editing)}`, payload);
      setEditing(null); setMessage(payload.publicado ? 'Guia publicado na central de ajuda.' : 'Rascunho salvo. Ele ainda não aparece para os clientes.');
      setRows(await api.get('/guias/admin'));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const field = 'w-full rounded-xl border border-slate-200 bg-slate-50 p-3 mt-2';
  return <>
    <PanelPageHeader title="Guias de ajuda" description="Revise orientações oficiais antes de disponibilizar aos clientes."><Link to="/ajuda" className="text-blue-700 py-3">Ver central de ajuda</Link></PanelPageHeader>
    {error && <PanelError message={error} />}{message && <p role="status" className="panel-feedback mb-4">{message}</p>}
    <button disabled={busy} className="bg-blue-700 text-white rounded-xl px-5 py-3 mb-5" onClick={() => { setEditing('new'); setForm({ ...empty, revisadoEm: dateInput(new Date()) }); setError(''); }}>Novo guia</button>
    {editing && <form onSubmit={save} className="grid gap-5 bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 mb-6"><h2 className="font-bold text-xl">{editing === 'new' ? 'Novo guia' : 'Editar guia'}</h2>
      <div className="grid sm:grid-cols-2 gap-4"><label>Operadora<select value={form.operadora} onChange={e => change('operadora', e.target.value)} className={field}>{['TIM', 'VIVO', 'CLARO', 'ALGAR'].map(operator => <option key={operator}>{operator}</option>)}</select></label><label>Assunto<select value={form.topico} onChange={e => change('topico', e.target.value)} className={field}>{Object.entries(topics).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <label>Título<input required minLength={2} maxLength={120} value={form.titulo} onChange={e => change('titulo', e.target.value)} className={field} /></label><label>Resumo<textarea required minLength={5} maxLength={600} rows={2} value={form.resumo} onChange={e => change('resumo', e.target.value)} className={field} /></label><label>Passos do guia<textarea required rows={5} value={form.passos} onChange={e => change('passos', e.target.value)} className={field} /><span className="block mt-2 text-sm text-slate-500">Um passo por linha. Até 12 passos de 600 caracteres. Use instruções conferidas; não peça senhas ou códigos privados.</span></label>
      <div className="grid sm:grid-cols-2 gap-4"><label>Fonte oficial (URL)<input required type="url" maxLength={1500} value={form.fonte} onChange={e => change('fonte', e.target.value)} className={field} /></label><label>Atendimento oficial (URL)<input required type="url" maxLength={1500} value={form.canalOficial} onChange={e => change('canalOficial', e.target.value)} className={field} /></label><label>Data da revisão<input required type="date" value={form.revisadoEm} onChange={e => change('revisadoEm', e.target.value)} className={field} /></label><label>Válido até<input required type="date" value={form.validoAte} onChange={e => change('validoAte', e.target.value)} className={field} /></label></div>
      <p className="text-sm text-slate-500">Use páginas HTTPS da própria operadora. Guias vencidos saem da central automaticamente. Validade máxima: 180 dias.</p>
      <section aria-label="Prévia do guia" className="rounded-2xl border border-slate-200 p-5 bg-slate-50"><h3 className="font-bold">{form.titulo || 'Título do guia'}</h3><p className="whitespace-pre-wrap break-words my-3">{form.resumo || 'Resumo da orientação'}</p><ol className="list-decimal pl-5 space-y-2">{form.passos.split('\n').filter(text => text.trim()).map((text, index) => <li key={index} className="whitespace-pre-wrap break-words">{text}</li>)}</ol></section>
      <label className="flex items-start gap-3"><input type="checkbox" checked={form.publicado} onChange={e => change('publicado', e.target.checked)} className="mt-1" /><span>Conferi as fontes e quero publicar este guia.<small className="block text-slate-500 mt-1">Alterar o conteúdo desmarca a publicação para exigir nova conferência.</small></span></label>
      <div className="flex gap-4"><button disabled={busy} className="bg-blue-700 text-white rounded-xl px-5 py-3">{busy ? 'Salvando…' : 'Salvar guia'}</button><button disabled={busy} type="button" onClick={() => setEditing(null)} className="text-blue-700 px-4 py-3">Cancelar edição</button></div>
    </form>}
    {rows === null ? <PanelLoading /> : !rows.length ? <p className="panel-feedback">Nenhum guia cadastrado. Comece pelos assuntos mais procurados.</p> : <div className="grid sm:grid-cols-2 gap-4">{rows.map(row => <article key={row.id} className="bg-white rounded-2xl border border-slate-200 p-5"><p className="text-sm text-blue-700">{row.operadora} · {topics[row.topico]}</p><h2 className="font-bold text-lg my-2">{row.titulo}</h2><p className="text-sm text-slate-600 break-words">{row.resumo}</p><p className="text-sm mt-3">{row.publicado ? 'Publicado' : 'Rascunho'} · Validade: {new Date(row.validoAte).toLocaleDateString('pt-BR')}</p><button disabled={busy} className="text-blue-700 py-3" onClick={() => { setEditing(row.id); setForm({ operadora: row.operadora, topico: row.topico, titulo: row.titulo, resumo: row.resumo, passos: row.passos.join('\n'), fonte: row.fonte, canalOficial: row.canalOficial, revisadoEm: dateInput(row.revisadoEm), validoAte: dateInput(row.validoAte), publicado: row.publicado }); }}>Editar {row.titulo}</button></article>)}</div>}
  </>;
}
