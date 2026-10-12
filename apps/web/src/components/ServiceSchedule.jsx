import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function serviceSlotLabel(slot) {
  if (!slot) return '';
  const format = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
  return `${format.format(new Date(slot.inicio))} até ${format.format(new Date(slot.fim))} (horário de Brasília)`;
}
export default function ServiceSchedule({ lojaId, servicoId, selected, onChange }) {
  const [slots, setSlots] = useState(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    api.get(`/agenda?lojaId=${encodeURIComponent(lojaId)}&servicoId=${encodeURIComponent(servicoId)}`).then(rows => { if (active) { setSlots(rows); setError(''); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [lojaId, servicoId, reload]);
  return <div className="mt-5">
    <label>Horário de atendimento (opcional)<select value={selected?.id || ''} onChange={e => onChange(slots?.find(slot => slot.id === e.target.value) || null)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 mt-2"><option value="">Solicitar sem agendamento</option>{slots?.map(slot => <option key={slot.id} value={slot.id} disabled={slot.vagas < 1}>{serviceSlotLabel(slot)} — {slot.vagas > 0 ? `${slot.vagas} vaga(s)` : 'Lotado'}</option>)}</select></label>
    <p className="text-sm text-slate-500 mt-2">A vaga é reservada somente após enviar e receber o protocolo. O agendamento não confirma orçamento ou pagamento.</p>
    {slots === null && !error && <p role="status" className="text-sm mt-2">Consultando horários…</p>}
    {slots?.length === 0 && <p className="text-sm mt-2">Sem horários disponíveis. Você pode enviar sem agendamento.</p>}
    {error && <p role="alert" className="text-red-700 text-sm mt-2">{error}</p>}
    <button type="button" className="text-blue-700 py-3" onClick={() => { onChange(null); setReload(value => value + 1); }}>Atualizar horários</button>
  </div>;
}
