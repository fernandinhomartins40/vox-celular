import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { requestForSession, sessionRevision } from './api';
type Quote = { id: string; versao: number; valorCentavos: number; descricao: string; validoAte: string; status: string };
export default function ServiceQuotes({ requestId, revision }: { requestId: string; revision: number }) {
  const [rows, setRows] = useState<Quote[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checkedAt, setCheckedAt] = useState(0);
  const mounted = useRef(false); const running = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  async function run(quote?: Quote, accept?: boolean) {
    if (running.current || sessionRevision() !== revision) return;
    running.current = true; setBusy(true); setError('');
    const active = () => mounted.current && sessionRevision() === revision;
    try {
      if (quote) await requestForSession(revision, `/orcamentos-servico/${encodeURIComponent(quote.id)}/decisao`, { aceitar: accept });
      const data = await requestForSession<Quote[]>(revision, `/orcamentos-servico?solicitacaoId=${encodeURIComponent(requestId)}`);
      if (active()) { setRows(data); setCheckedAt(Date.now()); }
    } catch (e) { if (active()) setError(e instanceof Error ? e.message : 'Não foi possível confirmar. Consulte novamente.'); }
    finally { running.current = false; if (active()) setBusy(false); }
  }
  function decide(quote: Quote, accept: boolean) {
    Alert.alert(accept ? 'Aceitar orçamento?' : 'Recusar orçamento?', `Versão ${quote.versao}: ${money(quote.valorCentavos)}. Confira a descrição antes de confirmar.`, [{ text: 'Voltar', style: 'cancel' }, { text: 'Confirmar decisão', onPress: () => { void run(quote, accept); } }]);
  }
  const button = (text: string, action: () => void) => <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={action} style={{ minHeight: 48, paddingVertical: 14 }}><Text style={{ color: '#0036cc', fontWeight: '600' }}>{text}</Text></Pressable>;
  const labels: Record<string, string> = { PENDENTE: 'Aguardando sua decisão', ACEITO: 'Aceito', RECUSADO: 'Recusado', SUBSTITUIDO: 'Substituído' };
  return <View style={{ borderTopWidth: 1, borderColor: '#dce4f3', marginTop: 16, paddingTop: 12 }}>{button(busy ? 'Consultando…' : 'Consultar orçamentos', () => { void run(); })}{error && <Text accessibilityRole="alert" style={{ color: '#9c1230' }}>{error}</Text>}{rows?.length === 0 && <Text>A loja ainda não enviou orçamento.</Text>}{rows?.map((quote, index) => <View key={quote.id} style={{ backgroundColor: '#f4f6fc', borderRadius: 12, padding: 16, marginTop: 12 }}><Text style={{ fontWeight: '700', color: '#10243e' }}>Versão {quote.versao} · {money(quote.valorCentavos)}</Text><Text style={{ color: '#52647b', marginVertical: 12 }}>{quote.descricao}</Text><Text>Válido até {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(quote.validoAte))} (Brasília)</Text><Text style={{ marginTop: 12 }}>{quote.status === 'PENDENTE' && Date.parse(quote.validoAte) <= checkedAt ? 'Orçamento vencido. Peça uma nova proposta à loja.' : labels[quote.status] || quote.status}</Text>{index === 0 && quote.status === 'PENDENTE' && Date.parse(quote.validoAte) > checkedAt && <>{button('Aceitar orçamento', () => decide(quote, true))}{button('Recusar orçamento', () => decide(quote, false))}</>}</View>)}</View>;
}
