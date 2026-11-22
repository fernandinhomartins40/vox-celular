import { Icon } from '../../src/icons';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, Text, View } from 'react-native';
import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { requestForSession, sessionRevision } from '../../src/api';
import { orderContactUrl } from '../../src/storeContact';
type Order = { id: string; codigo: string; status: string; total: number | string; pagamento: string; canceladoEm?: string | null; itens: { nome: string; qty: number }[]; timeline?: { id: string; status: string; data: string | null; ok: boolean }[] };
const labels: Record<string, string> = { NOVO: 'Recebido', EM_PREPARO: 'Em preparo', PRONTO: 'Pronto', ENTREGUE: 'Entregue', CANCELADO: 'Cancelado' };
export default function Orders() {
  const params = useLocalSearchParams<{ pedido?: string | string[] }>();
  const requestedId = typeof params.pedido === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(params.pedido) ? params.pedido : '';
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
    requestForSession<Order[]>(sessionRevision(), '/pedidos/meus').then(data => { if (active) { setRows(data); if (requestedId && data.some(order => order.id === requestedId)) setExpanded(requestedId); } }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setRefreshing(false); });
    return () => { active = false; };
  }, [reload, requestedId]));
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
  return <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 24 }}><Text accessibilityRole="header" style={{ fontSize: 26, letterSpacing: -0.9, fontFamily: 'DMSans_700Bold', color: '#14213d' }}>Meus pedidos</Text><Text style={{ fontSize: 14, color: '#66758b', fontFamily: 'DMSans_400Regular', marginTop: 8, marginBottom: 28 }}>Acompanhe suas compras e consulte os detalhes.</Text>
    {rows && requestedId && <View style={{ marginBottom: 12 }}>{!rows.some(order => order.id === requestedId) && <Text accessibilityRole="alert" style={{ color: '#4a5870' }}>Este pedido não está disponível nesta conta.</Text>}<Link href="/pedidos" replace style={{ color: '#0825A3', paddingVertical: 14 }}>Ver todos os meus pedidos</Link></View>}
    {contactError && <Text accessibilityRole="alert" style={{ color: '#b91c1c', marginBottom: 12 }}>{contactError}</Text>}{error ? <View><Text accessibilityRole="alert" style={{ color: '#b91c1c' }}>{error}</Text><Link href="/conta" style={{ color: '#0825A3', paddingVertical: 16 }}>Entrar na minha conta</Link><Pressable accessibilityRole="button" onPress={() => setReload(value => value + 1)} style={{ paddingVertical: 16 }}><Text style={{ color: '#0825A3' }}>Tentar novamente</Text></Pressable></View> : rows === null ? <ActivityIndicator color="#0036cc" /> : <FlatList data={requestedId && rows.some(order => order.id === requestedId) ? rows.filter(order => order.id === requestedId) : rows} keyExtractor={item => item.id} refreshing={refreshing} onRefresh={() => setReload(value => value + 1)} ListEmptyComponent={<View style={{ alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce3ef', borderRadius: 16, paddingVertical: 32, paddingHorizontal: 20 }}><Icon.package size={28} color="#4a5870" /><Text style={{ fontFamily: 'DMSans_700Bold', color: '#14213d', fontSize: 14 }}>Nenhum pedido ainda</Text><Text style={{ fontFamily: 'DMSans_400Regular', color: '#4a5870', fontSize: 14, textAlign: 'center', lineHeight: 21 }}>Escolha um produto na loja. Suas compras registradas pela equipe aparecerão aqui.</Text><Link href="/loja" style={{ marginTop: 6, backgroundColor: '#0825A3', color: '#fff', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, fontFamily: 'DMSans_600SemiBold', overflow: 'hidden' }}>Escolher um produto</Link></View>} renderItem={({ item }) => <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#dce3ef' }}><Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 18 }}>{item.codigo}</Text><Text style={{ color: '#0825A3', marginVertical: 10 }}>{item.canceladoEm ? 'Cancelado' : labels[item.status] || item.status}</Text>{item.itens.map((product, index) => <Text key={index}>{product.qty} × {product.nome}</Text>)}<Text style={{ fontFamily: 'DMSans_700Bold', marginTop: 12 }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.total))}</Text><Text style={{ color: '#4a5870', marginTop: 6 }}>Pagamento: {item.pagamento}</Text><Pressable accessibilityRole="button" disabled={contactBusy} onPress={() => contact(item)} style={{ minHeight: 48, paddingVertical: 14 }}><Text style={{ color: '#0825A3', fontFamily: 'DMSans_700Bold' }}>Falar com a loja sobre este pedido</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{ expanded: expanded === item.id }} onPress={() => setExpanded(value => value === item.id ? null : item.id)} style={{ minHeight: 48, paddingVertical: 14 }}><Text style={{ color: '#0825A3', fontFamily: 'DMSans_700Bold' }}>{expanded === item.id ? 'Ocultar acompanhamento' : 'Ver acompanhamento'}</Text></Pressable>{expanded === item.id && <View><Text accessibilityRole="header" style={{ fontFamily: 'DMSans_700Bold', marginBottom: 12 }}>Histórico do pedido</Text>{!item.timeline?.length ? <Text>A loja ainda não publicou atualizações.</Text> : item.timeline.map(event => <View key={event.id} style={{ borderLeftWidth: 2, borderColor: event.ok ? '#0825A3' : '#dce3ef', paddingLeft: 12, marginBottom: 14 }}><Text style={{ fontFamily: 'DMSans_600SemiBold' }}>{event.status} · {event.ok ? 'Concluído' : 'Pendente'}</Text><Text style={{ color: '#4a5870', marginTop: 6 }}>{event.data ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(event.data)) + ' (Brasília)' : 'Sem data informada'}</Text></View>)}</View>}</View>} />}
  </View>;
}
