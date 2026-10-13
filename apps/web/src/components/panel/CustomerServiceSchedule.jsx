import { useEffect, useRef, useState } from 'react';
import { api, getSessionGeneration } from '../../lib/api';
const date = value => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
export default function CustomerServiceSchedule({ ticket, onUpdated }) {
  const [slots, setSlots] = useState(null), [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const mounted = useRef(false), operation = useRef(false), revision = useRef(getSessionGeneration());
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const active = () => mounted.current && revision.current === getSessionGeneration();
  async function run(change = false) {
    if (operation.current || !active()) return;
    const target = slots?.find(slot => slot.id === selected);
    if (change && (!target || !window.confirm(`Trocar o horário para ${date(target.inicio)} (Brasília)? Sua reserva atual só será liberada após a confirmação da nova vaga.`))) return;
    operation.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (change) {
        await api.post(`/servicos/solicitacoes/${encodeURIComponent(ticket.id)}/horario`, { horarioId: selected, horarioAtualId: ticket.horarioId || null });
        if (active()) { setMessage('Novo horário confirmado.'); setSlots(null); setSelected(''); onUpdated?.(); }
      } else {
        const rows = await api.get(`/agenda?lojaId=${encodeURIComponent(ticket.lojaId)}&servicoId=${encodeURIComponent(ticket.servicoId)}`);
        if (active()) { setSlots(rows.filter(slot => slot.id !== ticket.horarioId)); setSelected(''); }
      }
    } catch (e) { if (active()) setError(e.message); }
    finally { operation.current = false; if (active()) setBusy(false); }
  }
  return <section className="mt-4 border-t border-slate-200 pt-3" aria-label="Agendamento do atendimento">{ticket.horario && <p className="panel-muted mb-3">Horário reservado: {date(ticket.horario.inicio)} (Brasília)</p>}{['RECEBIDA', 'EM_ANALISE', 'AGUARDANDO_CLIENTE'].includes(ticket.status) && <><button type="button" disabled={busy} onClick={() => run()} className="panel-secondary-button">{busy ? 'Consultando…' : ticket.horarioId ? 'Trocar horário' : 'Consultar horários'}</button>{slots && <div className="mt-3"><p className="panel-muted mb-3">Escolha uma vaga e confirme. A disponibilidade é verificada ao salvar.</p>{slots.length ? <label className="block">Novo horário<select aria-label="Novo horário" value={selected} disabled={busy} onChange={e => setSelected(e.target.value)} className="panel-input mt-2 w-full"><option value="">Selecione uma vaga</option>{slots.map(slot => <option key={slot.id} value={slot.id} disabled={!slot.vagas}>{date(slot.inicio)} · {slot.vagas ? `${slot.vagas} vaga(s)` : 'Lotado'}</option>)}</select></label> : <p>Sem outros horários publicados. Fale com a loja.</p>}<div className="flex flex-wrap gap-3 mt-3"><button type="button" disabled={busy || !selected} onClick={() => run(true)} className="panel-primary-button">Confirmar novo horário</button><button type="button" disabled={busy} onClick={() => { setSlots(null); setSelected(''); setError(''); }} className="panel-secondary-button">Voltar</button></div></div>}</>}{error && <p role="alert" className="panel-account-error mt-3">{error}</p>}{message && <p role="status" className="panel-feedback mt-3">{message}</p>}</section>;
}
