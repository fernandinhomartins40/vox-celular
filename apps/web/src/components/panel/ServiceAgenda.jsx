import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { serviceSlotLabel } from '../../lib/serviceSchedule';

export default function ServiceAgenda({ services, onUpdated }) {
  const [slots, setSlots] = useState(null);
  const [form, setForm] = useState({ servicoId: '', inicio: '', fim: '', capacidade: 1 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    api.get('/agenda/admin').then(rows => { if (active) setSlots(rows); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  const selected = services.find(service => service.id === form.servicoId);
  async function execute(action, success) {
    setBusy(true); setError(''); setMessage('');
    try { await action(); setMessage(success); setSlots(await api.get('/agenda/admin')); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  function save(event) {
    event.preventDefault();
    return execute(async () => {
      // Inputs explicitly use Brasília time, independent of the browser timezone.
      await api.post('/agenda', { ...form, inicio: new Date(`${form.inicio}:00-03:00`).toISOString(), fim: new Date(`${form.fim}:00-03:00`).toISOString(), capacidade: Number(form.capacidade) });
      setForm(previous => ({ ...previous, inicio: '', fim: '' }));
    }, 'Horário criado.');
  }
  const field = 'w-full rounded-xl border border-slate-200 bg-slate-50 p-3 mt-2';
  return <section aria-label="Agenda de serviços">
    {error && <p role="alert" className="panel-feedback mb-4">{error}</p>}{message && <p role="status" className="panel-feedback mb-4">{message}</p>}
    <form onSubmit={save} className="bg-white border border-slate-200 rounded-2xl p-5 grid gap-4 mb-6">
      <h2 className="text-xl font-bold">Abrir horário de atendimento</h2><p className="text-sm text-slate-500">Datas no horário de Brasília. As vagas são reservadas quando o cliente envia a solicitação.</p>
      <label>Serviço da agenda<select required value={form.servicoId} onChange={e => setForm(previous => ({ ...previous, servicoId: e.target.value }))} className={field}><option value="">Escolha um serviço</option>{services.filter(service => service.ativo).map(service => <option key={service.id} value={service.id}>{service.titulo}</option>)}</select></label>
      {selected && <div className="flex flex-wrap items-center gap-3"><p>{selected.agendamento ? 'Agendamento habilitado' : 'Agendamento desabilitado'}</p><button type="button" disabled={busy} className="text-blue-700 py-3" onClick={() => execute(async () => { await api.patch(`/servicos/${encodeURIComponent(selected.id)}`, { agendamento: !selected.agendamento }); await onUpdated(); }, selected.agendamento ? 'Novas reservas desabilitadas; reservas existentes preservadas.' : 'Agendamento habilitado.')}>{selected.agendamento ? 'Desabilitar novas reservas' : 'Habilitar agendamento'}</button></div>}
      <div className="grid gap-4 sm:grid-cols-3"><label>Início<input required type="datetime-local" value={form.inicio} onChange={e => setForm(previous => ({ ...previous, inicio: e.target.value }))} className={field} /></label><label>Fim<input required type="datetime-local" value={form.fim} onChange={e => setForm(previous => ({ ...previous, fim: e.target.value }))} className={field} /></label><label>Número de vagas<input required type="number" min="1" max="20" value={form.capacidade} onChange={e => setForm(previous => ({ ...previous, capacidade: e.target.value }))} className={field} /></label></div>
      <button disabled={busy || !selected?.agendamento} className="bg-blue-700 text-white rounded-xl px-5 py-3 justify-self-start disabled:opacity-50">Criar horário</button>
    </form>
    <h2 className="font-bold text-xl mb-4">Horários e reservas</h2>{slots === null ? <p>Carregando horários…</p> : !slots.length ? <p className="panel-feedback">Nenhum horário aberto.</p> : <div className="grid gap-4">{slots.map(slot => <article key={slot.id} className="bg-white border border-slate-200 rounded-2xl p-5"><h3 className="font-bold">{slot.servico.titulo}</h3><p className="my-2">{serviceSlotLabel(slot)}</p><p>{slot._count.solicitacoes} reserva(s) de {slot.capacidade} vaga(s) · {slot.ativo ? 'Aberto' : 'Fechado para novas reservas'}</p><button disabled={busy} className="text-blue-700 py-3" onClick={() => execute(() => api.patch(`/agenda/${encodeURIComponent(slot.id)}`, { ativo: !slot.ativo }), slot.ativo ? 'Horário fechado. Reservas existentes preservadas.' : 'Horário reaberto.')}>{slot.ativo ? 'Fechar novas reservas' : 'Reabrir horário'}</button></article>)}</div>}
  </section>;
}
