import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { request, requestForSession, sessionRevision } from '../src/api';
import { serviceContactUrl } from '../src/storeContact';

type Service = { id: string; titulo: string; descricao: string; preco: number | null; agendamento: boolean };
type Slot = { id: string; inicio: string; fim: string; vagas: number };
type Ticket = { id: string; protocolo: string; status: string; aparelho: string; problema: string; horarioId?: string; servico?: { titulo: string }; horario?: { inicio: string; fim: string }; historico?: { id: string; status: string; mensagem: string; createdAt: string }[] };
const statuses: Record<string, string> = { RECEBIDA: 'Recebida', EM_ANALISE: 'Em análise', AGUARDANDO_CLIENTE: 'Aguardando você', EM_EXECUCAO: 'Em atendimento', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' };
const when = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value));
const price = (value: number | null) => value === null ? 'Sob orçamento' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
export default function Services() {
  const [storeId, setStoreId] = useState('');
  const [services, setServices] = useState<Service[] | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [step, setStep] = useState(1);
  const [device, setDevice] = useState('');
  const [problem, setProblem] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState('');
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotError, setSlotError] = useState('');
  const [slotReload, setSlotReload] = useState(0);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<Ticket | null>(null);
  const attempt = useRef<string | null>(null);
  const sending = useRef(false);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [historyBusy, setHistoryBusy] = useState(false);
  const formRevision = useRef(sessionRevision());
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState('');
  useFocusEffect(useCallback(() => {
    const revision = sessionRevision();
    setTickets(null); setHistoryError(''); setHistoryBusy(false); setContactError('');
    if (formRevision.current !== revision) {
      formRevision.current = revision;
      setReceipt(null);
      attempt.current = null;
      setService(null); setStep(1); setDevice(''); setProblem(''); setSlotId(''); setError('');
    }
  }, []));
  useEffect(() => {
    let active = true;
    setError(''); setServices(null);
    (async () => {
      const store = await request<{ id: string }>('/loja');
      const rows = await request<Service[]>(`/servicos?lojaId=${encodeURIComponent(store.id)}`);
      if (active) { setStoreId(store.id); setServices(rows); }
    })().catch(e => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível consultar os serviços.'); });
    return () => { active = false; };
  }, [reload]);
  useEffect(() => {
    let active = true;
    setSlots([]); setSlotId(''); setSlotError('');
    if (!service?.agendamento || !storeId) { setSlotLoading(false); return; }
    setSlotLoading(true);
    request<Slot[]>(`/agenda?lojaId=${encodeURIComponent(storeId)}&servicoId=${encodeURIComponent(service.id)}`)
      .then(data => { if (active) setSlots(data); })
      .catch(e => { if (active) setSlotError(e instanceof Error ? e.message : 'Não foi possível consultar os horários.'); })
      .finally(() => { if (active) setSlotLoading(false); });
    return () => { active = false; };
  }, [service?.id, service?.agendamento, storeId, slotReload]);
  function edit() { attempt.current = null; setError(''); }
  function review() {
    setError('');
    if (device.trim().length < 2 || problem.trim().length < 5) { setError('Informe o aparelho e descreva como podemos ajudar.'); return; }
    setStep(3);
  }
  async function send() {
    if (!service || sending.current) return;
    const revision = formRevision.current;
    sending.current = true;
    setBusy(true); setError('');
    try {
      attempt.current ||= randomUUID();
      const result = await requestForSession<Ticket>(revision, '/servicos/solicitacoes', { servicoId: service.id, aparelho: device.trim(), problema: problem.trim(), chaveIdempotencia: attempt.current, ...(slotId ? { horarioId: slotId } : {}) });
      if (formRevision.current === revision && sessionRevision() === revision) { setReceipt(result); setTickets(null); }
    } catch (e) { if (formRevision.current === revision) setError(e instanceof Error ? e.message : 'Não foi possível confirmar. Tente novamente sem alterar os dados.'); }
    finally { sending.current = false; setBusy(false); }
  }
  async function loadHistory() {
    if (historyBusy) return;
    const revision = formRevision.current;
    setHistoryBusy(true); setHistoryError('');
    try { const rows = await requestForSession<Ticket[]>(revision, '/servicos/solicitacoes'); if (formRevision.current === revision) setTickets(rows); }
    catch (e) { if (formRevision.current === revision) setHistoryError(e instanceof Error ? e.message : 'Não foi possível consultar seus atendimentos.'); }
    finally { if (formRevision.current === revision) setHistoryBusy(false); }
  }
  async function contact(ticket: Ticket) {
    if (contactBusy) return;
    const revision = formRevision.current;
    setContactBusy(true); setContactError('');
    try {
      const profile = await requestForSession<{ lojaId: string }>(revision, '/auth/me');
      const store = await requestForSession<{ telefone: string }>(revision, `/loja?lojaId=${encodeURIComponent(profile.lojaId)}`);
      if (sessionRevision() !== revision) throw new Error('Sua conta mudou. Atualize os atendimentos.');
      await Linking.openURL(serviceContactUrl(store.telefone, ticket.protocolo));
    } catch (e) { if (formRevision.current === revision) setContactError(e instanceof Error ? e.message : 'Não foi possível abrir o atendimento.'); }
    finally { setContactBusy(false); }
  }
  function startAgain() { setReceipt(null); setService(null); setStep(1); setDevice(''); setProblem(''); setSlotId(''); edit(); }
  const selectedSlot = slots.find(row => row.id === slotId);
  const button = (label: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={action} style={[styles.button, disabled && styles.disabled]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={styles.heading}>Serviços da Vox</Text>
    <Text style={styles.text}>Escolha o serviço, conte o que precisa e confirme. A loja analisa sua solicitação antes de executar qualquer atendimento.</Text>
    {error && <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Link href="/conta" style={styles.link}>Entrar na minha conta</Link></View>}
    {contactError && <Text accessibilityRole="alert" style={styles.error}>{contactError}</Text>}{receipt ? <View style={styles.card}><Text accessibilityRole="header" style={styles.title}>Solicitação recebida</Text><Text selectable style={styles.text}>Protocolo: {receipt.protocolo}</Text><Text style={styles.text}>{statuses[receipt.status] || receipt.status}</Text><Text style={styles.text}>{receipt.horarioId ? 'Horário reservado. Consulte os detalhes em Meus atendimentos.' : 'A loja vai analisar e combinar o atendimento com você.'}</Text>{button('Falar com a loja sobre este atendimento', () => { void contact(receipt); }, contactBusy)}{button('Solicitar outro serviço', startAgain)}</View> : <>
      <Text accessibilityRole="header" style={styles.title}>Passo {step} de 3</Text>
      {step === 1 && (services === null ? error ? button('Tentar novamente', () => setReload(value => value + 1)) : <ActivityIndicator color="#0036cc" /> : !services.length ? <Text style={styles.text}>Nenhum serviço disponível no momento.</Text> : services.map(row => <View key={row.id} style={styles.card}><Text style={styles.title}>{row.titulo}</Text><Text style={styles.text}>{row.descricao}</Text><Text style={styles.text}>{price(row.preco)}</Text>{button('Escolher este serviço', () => { setService(row); setStep(2); edit(); })}</View>))}
      {step === 2 && service && <View style={styles.card}><Text style={styles.title}>{service.titulo}</Text><Text style={styles.label}>Aparelho</Text><TextInput accessibilityLabel="Aparelho" value={device} onChangeText={value => { setDevice(value); edit(); }} maxLength={160} style={styles.input} placeholder="Ex.: meu celular Samsung" /><Text style={styles.label}>Como podemos ajudar?</Text><TextInput accessibilityLabel="Como podemos ajudar?" value={problem} onChangeText={value => { setProblem(value); edit(); }} maxLength={2000} multiline style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]} placeholder="Descreva o que você precisa" />
        {service.agendamento && <View><Text style={styles.title}>Horário opcional</Text><Text style={styles.text}>Horários de Brasília. A vaga só é reservada ao confirmar.</Text>{slotLoading && <ActivityIndicator color="#0036cc" />}{slotError && <Text accessibilityRole="alert" style={styles.error}>{slotError}</Text>}{button('Atualizar horários', () => { edit(); setSlotReload(value => value + 1); }, slotLoading)}{button(slotId ? 'Enviar sem agendamento' : 'Sem agendamento selecionado', () => { setSlotId(''); edit(); })}{slots.map(slot => <Pressable key={slot.id} accessibilityRole="radio" accessibilityState={{ selected: slotId === slot.id, disabled: !slot.vagas }} disabled={!slot.vagas} onPress={() => { setSlotId(slot.id); edit(); }} style={[styles.slot, slotId === slot.id && styles.selected, !slot.vagas && styles.disabled]}><Text style={styles.text}>{when(slot.inicio)} – {when(slot.fim)}{slot.vagas ? ` · ${slot.vagas} vaga(s)` : ' · Lotado'}</Text></Pressable>)}{!slotLoading && !slotError && !slots.length && <Text style={styles.text}>Sem horários publicados. Você pode enviar sem agendamento.</Text>}</View>}
        {button('Revisar solicitação', review)}{button('Voltar aos serviços', () => { setStep(1); edit(); })}
      </View>}
      {step === 3 && service && <View style={styles.card}><Text style={styles.title}>Confira antes de enviar</Text><Text style={styles.text}>{service.titulo} · {price(service.preco)}</Text><Text style={styles.text}>Aparelho: {device.trim()}</Text><Text style={styles.text}>{problem.trim()}</Text><Text style={styles.text}>{selectedSlot ? `Horário solicitado: ${when(selectedSlot.inicio)} (Brasília)` : 'Sem agendamento'}</Text><Text style={styles.text}>O envio não realiza pagamento nem autoriza reparos. Você receberá um protocolo após a confirmação do servidor.</Text>{button(busy ? 'Enviando…' : 'Confirmar solicitação', send, busy)}{button('Editar informações', () => { setStep(2); setError(''); }, busy)}</View>}
    </>}
    <View style={styles.card}><Text accessibilityRole="header" style={styles.title}>Meus atendimentos</Text>{button(historyBusy ? 'Consultando…' : 'Consultar meus atendimentos', loadHistory, historyBusy)}{historyError && <View><Text accessibilityRole="alert" style={styles.error}>{historyError}</Text><Link href="/conta" style={styles.link}>Entrar na minha conta</Link></View>}{tickets && !tickets.length && <Text style={styles.text}>Você ainda não tem atendimentos.</Text>}{tickets?.map(ticket => <View key={ticket.id} style={styles.history}><Text style={styles.title}>{ticket.servico?.titulo || 'Atendimento'}</Text><Text selectable style={styles.text}>{ticket.protocolo}</Text><Text style={styles.text}>{statuses[ticket.status] || ticket.status}</Text>{button('Falar com a loja sobre este atendimento', () => { void contact(ticket); }, contactBusy)}{ticket.horario && <Text style={styles.text}>Horário: {when(ticket.horario.inicio)} (Brasília)</Text>}{ticket.historico?.map(event => <View key={event.id}><Text style={styles.label}>{statuses[event.status] || event.status} · {when(event.createdAt)}</Text><Text style={styles.text}>{event.mensagem}</Text></View>)}</View>)}</View>
  </ScrollView></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ screen: { padding: 20, paddingBottom: 40 }, heading: { fontSize: 25, color: '#10243e', fontWeight: '700', marginBottom: 16 }, title: { fontSize: 19, color: '#10243e', fontWeight: '700', marginBottom: 12 }, label: { fontWeight: '600', color: '#10243e', marginBottom: 8 }, text: { color: '#52647b', lineHeight: 22, marginBottom: 12 }, card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#dce4f3', marginBottom: 16 }, input: { borderWidth: 1, borderColor: '#dce4f3', borderRadius: 12, minHeight: 48, padding: 12, fontSize: 16, marginBottom: 16 }, button: { backgroundColor: '#0036cc', minHeight: 48, padding: 14, borderRadius: 12, marginBottom: 12 }, buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' }, disabled: { opacity: 0.5 }, error: { color: '#9c1230', marginBottom: 12 }, link: { color: '#0036cc', paddingVertical: 14 }, slot: { borderColor: '#dce4f3', borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 48, marginBottom: 12 }, selected: { borderColor: '#0036cc', backgroundColor: '#edf1ff' }, history: { borderTopWidth: 1, borderColor: '#dce4f3', paddingTop: 16, marginTop: 12 } });
