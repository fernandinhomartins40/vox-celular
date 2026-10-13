import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { requestForSession, sessionRevision } from '../src/api';
import { orderContactUrl } from '../src/storeContact';
type Order = { id: string; codigo: string; status: string; total: number | string; pagamento: string; canceladoEm?: string | null; itens: { nome: string; qty: number }[]; timeline?: { id: string; status: string; data: string | null; ok: boolean }[] };
const labels: Record<string, string> = { NOVO: 'Recebido', EM_PREPARO: 'Em preparo', PRONTO: 'Pronto', ENTREGUE: 'Entregue', CANCELADO: 'Cancelado' };
export default function Orders() {
  const [rows, setRows] = useState<Order[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState('');
  const pageRevision = useRef(sessionRevision());
  useFocusEffect(useCallback(() => {
    let active = true;
    pageRevision.current = sessionRevision(); setContactError('');
    setRows(null); setExpanded(null); setError(''); setRefreshing(true);
    requestForSession<Order[]>(sessionRevision(), '/pedidos/meus').then(data => { if (active) setRows(data); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setRefreshing(false); });
    return () => { active = false; };
  }, [reload]));
  async function contact(order: Order) {
    if (contactBusy) return;
    const revision = pageRevision.current;
    setContactBusy(true); setContactError('');
    try {
      const profile = await requestForSession<{ lojaId: string }>(revision, '/auth/me');
      const store = await requestForSession<{ telefone: string }>(revision, `/loja?lojaId=${encodeURIComponent(profile.lojaId)}`);
      if (sessionRevision() !== revision) throw new Error('Sua conta mudou. Atualize os pedidos.');
      await Linking.openURL(orderContactUrl(store.telefone, order.codigo));
    } catch (e) { if (pageRevision.current === revision) setContactError(e instanceof Error ? e.message : 'Não foi possível abrir o atendimento.'); }
    finally { setContactBusy(false); }
  }
  return <View style={{ flex: 1, padding: 20 }}><Text accessibilityRole="header" style={{ fontSize: 25, fontWeight: '700', color: '#10243e', marginBottom: 16 }}>Meus pedidos</Text>
    {contactError && <Text accessibilityRole="alert" style={{ color: '#9c1230', marginBottom: 12 }}>{contactError}</Text>}{error ? <View><Text accessibilityRole="alert" style={{ color: '#9c1230' }}>{error}</Text><Link href="/conta" style={{ color: '#0036cc', paddingVertical: 16 }}>Entrar na minha conta</Link><Pressable accessibilityRole="button" onPress={() => setReload(value => value + 1)} style={{ paddingVertical: 16 }}><Text style={{ color: '#0036cc' }}>Tentar novamente</Text></Pressable></View> : rows === null ? <ActivityIndicator color="#0036cc" /> : <FlatList data={rows} keyExtractor={item => item.id} refreshing={refreshing} onRefresh={() => setReload(value => value + 1)} ListEmptyComponent={<Text>Você ainda não tem pedidos registrados.</Text>} renderItem={({ item }) => <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#dce4f3' }}><Text style={{ fontWeight: '700', fontSize: 18 }}>{item.codigo}</Text><Text style={{ color: '#0036cc', marginVertical: 10 }}>{item.canceladoEm ? 'Cancelado' : labels[item.status] || item.status}</Text>{item.itens.map((product, index) => <Text key={index}>{product.qty} × {product.nome}</Text>)}<Text style={{ fontWeight: '700', marginTop: 12 }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.total))}</Text><Text style={{ color: '#52647b', marginTop: 6 }}>Pagamento: {item.pagamento}</Text><Pressable accessibilityRole="button" disabled={contactBusy} onPress={() => contact(item)} style={{ minHeight: 48, paddingVertical: 14 }}><Text style={{ color: '#0036cc', fontWeight: '700' }}>Falar com a loja sobre este pedido</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{ expanded: expanded === item.id }} onPress={() => setExpanded(value => value === item.id ? null : item.id)} style={{ minHeight: 48, paddingVertical: 14 }}><Text style={{ color: '#0036cc', fontWeight: '700' }}>{expanded === item.id ? 'Ocultar acompanhamento' : 'Ver acompanhamento'}</Text></Pressable>{expanded === item.id && <View><Text accessibilityRole="header" style={{ fontWeight: '700', marginBottom: 12 }}>Histórico do pedido</Text>{!item.timeline?.length ? <Text>A loja ainda não publicou atualizações.</Text> : item.timeline.map(event => <View key={event.id} style={{ borderLeftWidth: 2, borderColor: event.ok ? '#0036cc' : '#dce4f3', paddingLeft: 12, marginBottom: 14 }}><Text style={{ fontWeight: '600' }}>{event.status} · {event.ok ? 'Concluído' : 'Pendente'}</Text><Text style={{ color: '#52647b', marginTop: 6 }}>{event.data ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(event.data)) + ' (Brasília)' : 'Sem data informada'}</Text></View>)}</View>}</View>} />}
  </View>;
}
