import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { requestForSession, sessionRevision } from './api';
type Slot = { id: string; inicio: string; fim: string; vagas: number };
type Ticket = { id: string; lojaId: string; servicoId: string; horarioId?: string | null; status: string };
const when = (value: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
export default function ServiceSchedule({ ticket, revision, onUpdated }: { ticket: Ticket; revision: number; onUpdated: () => void }) {
  const [slots, setSlots] = useState<Slot[] | null>(null), [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const mounted = useRef(false), running = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const active = () => mounted.current && revision === sessionRevision();
  async function run(target?: Slot) {
    if (running.current || !active()) return;
    running.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (target) {
        await requestForSession(revision, `/servicos/solicitacoes/${encodeURIComponent(ticket.id)}/horario`, { horarioId: target.id, horarioAtualId: ticket.horarioId || null });
        if (active()) { setSlots(null); setSelected(''); setMessage('Novo horário confirmado.'); onUpdated(); }
      } else {
        const rows = await requestForSession<Slot[]>(revision, `/agenda?lojaId=${encodeURIComponent(ticket.lojaId)}&servicoId=${encodeURIComponent(ticket.servicoId)}`);
        if (active()) { setSlots(rows.filter(slot => slot.id !== ticket.horarioId)); setSelected(''); }
      }
    } catch (e) { if (active()) setError(e instanceof Error ? e.message : 'Não foi possível confirmar. Consulte o atendimento antes de tentar novamente.'); }
    finally { running.current = false; if (active()) setBusy(false); }
  }
  function confirm() {
    const target = slots?.find(slot => slot.id === selected && slot.vagas > 0);
    if (!target || busy || !active()) return;
    Alert.alert('Confirmar novo horário?', `${when(target.inicio)} (Brasília). Sua reserva atual só será liberada após a confirmação da nova vaga.`, [{ text: 'Voltar', style: 'cancel' }, { text: 'Confirmar horário', onPress: () => { void run(target); } }]);
  }
  const button = (label: string, action: () => void, disabled = busy) => <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={action} style={{ minHeight: 48, paddingVertical: 14, opacity: disabled ? 0.5 : 1 }}><Text style={{ color: '#0036cc', fontWeight: '600' }}>{label}</Text></Pressable>;
  if (!['RECEBIDA', 'EM_ANALISE', 'AGUARDANDO_CLIENTE'].includes(ticket.status)) return null;
  return <View style={{ borderTopWidth: 1, borderColor: '#dce4f3', paddingTop: 12, marginTop: 16 }}>{button(busy ? 'Consultando…' : ticket.horarioId ? 'Trocar horário' : 'Consultar horários', () => { void run(); })}{slots && <><Text style={{ color: '#52647b', marginVertical: 12 }}>Escolha uma vaga e confirme. A disponibilidade será verificada ao salvar.</Text>{!slots.length && <Text>Sem outros horários publicados. Fale com a loja.</Text>}{slots.map(slot => <Pressable key={slot.id} accessibilityRole="radio" accessibilityState={{ selected: selected === slot.id, disabled: busy || !slot.vagas }} disabled={busy || !slot.vagas} onPress={() => setSelected(slot.id)} style={{ minHeight: 48, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: selected === slot.id ? '#0036cc' : '#dce4f3', borderRadius: 12, backgroundColor: selected === slot.id ? '#edf1ff' : '#fff', opacity: slot.vagas ? 1 : 0.5 }}><Text>{when(slot.inicio)} – {when(slot.fim)} (Brasília) · {slot.vagas ? `${slot.vagas} vaga(s)` : 'Lotado'}</Text></Pressable>)}{button('Confirmar novo horário', confirm, busy || !selected)}{button('Voltar', () => { setSlots(null); setSelected(''); setError(''); })}</>}{error && <Text accessibilityRole="alert" style={{ color: '#9c1230', marginVertical: 12 }}>{error}</Text>}{message && <Text accessibilityLiveRegion="polite" style={{ color: '#10243e', marginVertical: 12 }}>{message}</Text>}</View>;
}
