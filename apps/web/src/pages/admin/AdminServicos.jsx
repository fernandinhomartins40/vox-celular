import MerchantServiceQuote from '../../components/panel/MerchantServiceQuote';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { formatBRL } from '../../utils';
import { PanelPageHeader } from '../../components/panel/PanelShell';
import { PanelError, PanelLoading } from '../../components/panel/PanelFeedback';
import ServiceAgenda from '../../components/panel/ServiceAgenda';

const labels = { RECEBIDA: 'Recebida', EM_ANALISE: 'Em análise', AGUARDANDO_CLIENTE: 'Aguardando cliente', EM_EXECUCAO: 'Em execução', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' };
const transitions = { RECEBIDA: ['EM_ANALISE', 'CANCELADA'], EM_ANALISE: ['AGUARDANDO_CLIENTE', 'EM_EXECUCAO', 'CANCELADA'], AGUARDANDO_CLIENTE: ['EM_ANALISE', 'EM_EXECUCAO', 'CANCELADA'], EM_EXECUCAO: ['AGUARDANDO_CLIENTE', 'CONCLUIDA', 'CANCELADA'] };
const empty = { titulo: '', descricao: '', preco: '', ativo: true };
export default function AdminServicos() {
  const [tab, setTab] = useState('solicitacoes');
  const [services, setServices] = useState(null);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [statusForm, setStatusForm] = useState({});
  async function load() {
    const [catalog, rows] = await Promise.all([api.get('/servicos/admin'), api.get('/servicos/solicitacoes')]);
    setServices(catalog); setRequests(rows);
  }
  useEffect(() => {
    let active = true;
    Promise.all([api.get('/servicos/admin'), api.get('/servicos/solicitacoes')]).then(([catalog, rows]) => { if (active) { setServices(catalog); setRequests(rows); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  async function refresh() { setError(''); try { await load(); } catch (e) { setError(e.message); } }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const body = { ...form, preco: form.preco === '' ? null : Number(form.preco) };
      if (editing === 'new') await api.post('/servicos', body); else await api.patch(`/servicos/${encodeURIComponent(editing)}`, body);
      setEditing(null); setForm(empty); setMessage('Serviço salvo.');
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function updateStatus(event, row) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await api.patch(`/servicos/solicitacoes/${encodeURIComponent(row.id)}/status`, statusForm[row.id]);
      setMessage('Atualização salva e disponível para o cliente.'); setStatusForm(previous => ({ ...previous, [row.id]: undefined }));
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const field = 'w-full rounded-xl border border-slate-200 bg-slate-50 p-3 mt-2';
  return <>
    <PanelPageHeader title="Serviços" description="Gerencie o catálogo e acompanhe as solicitações dos clientes."><button onClick={refresh} disabled={busy} className="text-blue-700 py-3">Atualizar</button></PanelPageHeader>
    {error && <PanelError message={error} />}{message && <p role="status" className="panel-feedback mb-4">{message}</p>}
    <div className="flex flex-wrap gap-3 mb-6" role="group" aria-label="Áreas de serviços">{[['solicitacoes', 'Solicitações'], ['catalogo', 'Catálogo de serviços'], ['agenda', 'Agenda de atendimento']].map(([value, label]) => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)} className={`rounded-xl px-4 py-3 ${tab === value ? 'bg-blue-700 text-white' : 'bg-white text-blue-700 border border-slate-200'}`}>{label}</button>)}</div>

    {services === null ? <PanelLoading /> : tab === 'agenda' ? <ServiceAgenda services={services} onUpdated={load} /> : tab === 'catalogo' ? <>
      <button disabled={busy} onClick={() => { setEditing('new'); setForm(empty); }} className="bg-blue-700 text-white rounded-xl px-5 py-3 mb-4">Novo serviço</button>
      {editing && <form onSubmit={save} className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 grid gap-4"><h2 className="font-bold text-xl">{editing === 'new' ? 'Novo serviço' : 'Editar serviço'}</h2><label>Nome do serviço<input required minLength={2} maxLength={100} value={form.titulo} onChange={e => setForm(previous => ({ ...previous, titulo: e.target.value }))} className={field} /></label><label>Descrição<textarea required minLength={2} maxLength={2000} rows={3} value={form.descricao} onChange={e => setForm(previous => ({ ...previous, descricao: e.target.value }))} className={field} /></label><label>Preço em reais (opcional)<input type="number" min="0" max="100000" step="0.01" value={form.preco} onChange={e => setForm(previous => ({ ...previous, preco: e.target.value }))} className={field} /><span className="block text-sm text-slate-500 mt-2">Deixe vazio para informar preço sob orçamento.</span></label><label className="flex gap-3 items-center"><input type="checkbox" checked={form.ativo} onChange={e => setForm(previous => ({ ...previous, ativo: e.target.checked }))} />Disponível para novas solicitações</label><div className="flex gap-4"><button disabled={busy} className="bg-blue-700 text-white rounded-xl px-5 py-3">Salvar serviço</button><button type="button" disabled={busy} onClick={() => setEditing(null)} className="text-blue-700 px-4 py-3">Cancelar edição</button></div></form>}
      {!services.length && <p className="panel-feedback">Cadastre um serviço para habilitar solicitações dos clientes.</p>}<div className="grid sm:grid-cols-2 gap-4">{services.map(row => <article key={row.id} className="bg-white border border-slate-200 rounded-2xl p-5"><h2 className="font-bold text-lg">{row.titulo}</h2><p className="text-sm text-slate-600 my-3 whitespace-pre-wrap break-words">{row.descricao}</p><p>{row.preco === null ? 'Sob orçamento' : formatBRL(row.preco)}</p><p className="text-sm my-2">{row.ativo ? 'Disponível' : 'Oculto para novas solicitações'}</p><button disabled={busy} className="text-blue-700 py-3" onClick={() => { setEditing(row.id); setForm({ titulo: row.titulo, descricao: row.descricao, preco: row.preco ?? '', ativo: row.ativo }); }}>Editar {row.titulo}</button></article>)}</div>
    </> : <>
      {!requests.length && <p className="panel-feedback">Nenhuma solicitação recebida ainda.</p>}<div className="grid gap-4">{requests.map(row => <article key={row.id} className="bg-white border border-slate-200 rounded-2xl p-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-bold text-lg">{row.servico?.titulo || 'Serviço'}</h2><strong className="text-blue-700">{labels[row.status] || row.status}</strong></div><p className="text-sm break-all my-2">{row.protocolo}</p><p className="break-words">{row.aparelho}</p><details className="mt-3"><summary className="cursor-pointer text-blue-700 py-3">Ver solicitação e responder</summary><p className="whitespace-pre-wrap break-words mb-4">{row.problema}</p><ol className="space-y-3 mb-5">{row.historico?.map(entry => <li key={entry.id} className="border-l-2 border-blue-200 pl-3"><strong>{labels[entry.status] || entry.status}</strong><p className="break-words">{entry.mensagem}</p></li>)}</ol>{transitions[row.status] && <form onSubmit={event => updateStatus(event, row)} className="grid gap-4"><label>Próximo status<select required value={statusForm[row.id]?.status || ''} onChange={e => setStatusForm(previous => ({ ...previous, [row.id]: { ...previous[row.id], status: e.target.value } }))} className={field}><option value="">Escolha uma opção</option>{transitions[row.status].map(status => <option key={status} value={status}>{labels[status]}</option>)}</select></label><label>Mensagem para o cliente<textarea required minLength={2} maxLength={1000} rows={3} value={statusForm[row.id]?.mensagem || ''} onChange={e => setStatusForm(previous => ({ ...previous, [row.id]: { ...previous[row.id], mensagem: e.target.value } }))} className={field} /></label><p className="text-sm text-slate-500">Esta mensagem fica visível no acompanhamento do cliente. Não inclua senhas ou códigos privados.</p><button disabled={busy} className="bg-blue-700 text-white rounded-xl px-5 py-3 justify-self-start">Salvar atualização</button></form>}<MerchantServiceQuote ticket={row} onUpdated={load} /></details></article>)}</div>
    </>}
  </>;
}
