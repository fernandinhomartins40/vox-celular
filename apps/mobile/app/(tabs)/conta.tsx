// "Conta" tab: PWA login card (ClienteLogin.jsx) when signed out, customer area home (ClienteHome.jsx) when signed in.
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hasSavedSession, logout, NativeUser, request, saveSession, Session } from '../../src/api';
import EmailVerification from '../../src/EmailVerification';
import { whatsappUrl } from '../../src/storeContact';
import { Icon } from '../../src/icons';
import { Disclosure, HelpLink, MetricCard, NextAction, Notice, P, PageHeader, PanelScreen, QuickActions, Surface, panelText } from '../../src/panel';
import { font, money } from '../../src/ui';

type Order = { id: string; codigo?: string; status: string; total: number; canceladoEm?: string | null; createdAt?: string; itens?: { nome?: string; produto?: { nome?: string } }[] };
type Points = { saldo: number; nivel: string; meta?: number; proximoNivel?: string; recompensas?: { pontos?: number; custo?: number }[] };
type Offer = { id: string; titulo: string; descricao?: string; desc?: string; preco?: number; precoOriginal?: number };
const STATUS: Record<string, string> = { NOVO: 'Novo', EM_PREPARO: 'Em preparo', PRONTO: 'Pronto', ENTREGUE: 'Entregue' };

function Login({ onSignedIn }: { onSignedIn: (user: NativeUser) => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', telefone: '' });
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (field: keyof typeof form) => (value: string) => setForm(previous => ({ ...previous, [field]: value }));
  async function submit() {
    setBusy(true); setError('');
    try {
      if (!form.email.trim() || !form.senha) throw new Error('Informe seu e-mail e sua senha.');
      if (creating && (form.nome.trim().length < 2 || form.senha.length < 12 || form.senha.length > 72)) throw new Error('Informe seu nome e use uma senha de 12 a 72 caracteres.');
      const store = await request<{ id: string }>('/loja');
      const session = await request<Session>(creating ? '/auth/register' : '/auth/login', { email: form.email.trim(), senha: form.senha, lojaId: store.id, plataforma: 'native', ...(creating ? { nome: form.nome.trim(), telefone: form.telefone.trim() } : {}) });
      await saveSession(session);
      if (session.user.role !== 'CLIENTE') { await logout(); throw new Error('Este aplicativo é para clientes. Use o painel web para administrar a loja.'); }
      onSignedIn(session.user);
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível entrar.'); }
    finally { setBusy(false); }
  }
  async function help() {
    try { const store = await request<{ telefone?: string }>('/loja'); await Linking.openURL(whatsappUrl(store.telefone || '', 'Olá! Preciso de orientação para recuperar o acesso à minha conta.')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível abrir o WhatsApp.'); }
  }
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: P.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={[st.authHeader, { paddingTop: insets.top + 16 }]}><Image source={require('../../assets/brand/vox-logo.png')} accessibilityLabel="VOX Celular" style={{ width: 116, height: 88 }} resizeMode="contain" /></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24 }}>
      <View style={st.card}>
        <Text accessibilityRole="header" style={[{ fontSize: 28, letterSpacing: -1, color: P.ink }, font(700)]}>Sua conta na VOX</Text>
        <Text style={[{ color: P.muted, fontSize: 14, marginTop: 12, marginBottom: 28 }, font()]}>Acompanhe pedidos, pontos e ofertas.</Text>
        {creating && <><Text style={st.label}>Nome</Text><TextInput accessibilityLabel="Nome" autoComplete="name" value={form.nome} onChangeText={set('nome')} maxLength={100} editable={!busy} style={st.input} /></>}
        <Text style={st.label}>E-mail</Text>
        <TextInput accessibilityLabel="E-mail" autoComplete="email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="seu@email.com" placeholderTextColor="#9aa3b5" value={form.email} onChangeText={set('email')} maxLength={254} editable={!busy} style={st.input} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={st.label}>Senha</Text>{!creating && <Pressable accessibilityRole="link" onPress={help} style={{ minHeight: 32, justifyContent: 'center' }}><Text style={[{ fontSize: 12, color: P.royal }, font()]}>Preciso de ajuda</Text></Pressable>}</View>
        <View style={{ justifyContent: 'center' }}>
          <TextInput accessibilityLabel="Senha" autoComplete={creating ? 'new-password' : 'current-password'} secureTextEntry={!show} placeholder="••••••" placeholderTextColor="#9aa3b5" value={form.senha} onChangeText={set('senha')} maxLength={creating ? 72 : undefined} editable={!busy} onSubmitEditing={submit} style={[st.input, { paddingRight: 48 }]} />
          <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Ocultar senha' : 'Mostrar senha'} accessibilityState={{ selected: show }} onPress={() => setShow(v => !v)} style={st.eye}><Icon.eye size={16} color="#a1a1aa" /></Pressable>
        </View>
        {creating && <Text style={[{ fontSize: 12, color: '#71717a', marginTop: -8, marginBottom: 16 }, font()]}>Use de 12 a 72 caracteres.</Text>}
        {creating && <><Pressable accessibilityRole="button" accessibilityState={{ expanded: phoneOpen }} onPress={() => setPhoneOpen(v => !v)} style={{ minHeight: 40, justifyContent: 'center', marginBottom: 8 }}><Text style={[{ fontSize: 14, color: P.ink }, font()]}>{phoneOpen ? '▼' : '▶'} Adicionar telefone (opcional)</Text></Pressable>
          {phoneOpen && <><Text style={st.label}>Telefone para contato</Text><TextInput accessibilityLabel="Telefone para contato" autoComplete="tel" keyboardType="phone-pad" value={form.telefone} onChangeText={set('telefone')} maxLength={30} editable={!busy} style={st.input} /><Text style={[{ fontSize: 12, color: '#71717a', marginTop: -8, marginBottom: 16 }, font()]}>Ajuda a loja a combinar os detalhes do seu pedido.</Text></>}</>}
        {error ? <View accessibilityRole="alert" style={st.error}><Icon.close size={16} color="#b91c1c" /><Text style={[{ flex: 1, fontSize: 13, color: '#b91c1c' }, font()]}>{error}</Text></View> : null}
        <Pressable accessibilityRole="button" disabled={busy} onPress={submit} style={[st.submit, busy && { opacity: 0.6 }]}>{busy ? <ActivityIndicator color="#fff" /> : <Icon.arrowRight size={16} color="#fff" />}<Text style={[{ color: '#fff', fontSize: 14, letterSpacing: 0.3 }, font(600)]}>{busy ? 'Aguarde…' : creating ? 'Criar minha conta' : 'Entrar na minha conta'}</Text></Pressable>
        {!creating && <Pressable accessibilityRole="link" disabled={busy} onPress={() => { set('senha')(''); router.push('/recuperar-senha'); }} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 16 }}><Text style={[{ fontSize: 14, color: P.royal }, font(500)]}>Esqueci minha senha</Text></Pressable>}
        <Text style={[{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#71717a' }, font()]}>{creating ? 'Já tem conta? ' : 'Ainda não tem conta? '}<Text accessibilityRole="button" onPress={() => { if (!busy) { setCreating(v => !v); setError(''); } }} style={[{ color: P.royal }, font(500)]}>{creating ? 'Entrar' : 'Criar conta grátis'}</Text></Text>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

function CustomerHome({ user, onLogout }: { user: NativeUser; onLogout: () => void }) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [points, setPoints] = useState<Points | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.allSettled([request<Order[] | { pedidos: Order[] }>('/pedidos/meus', undefined, true), request<Points>('/fidelidade/pontos', undefined, true), request<Offer[] | { promocoes: Offer[] }>(`/promocoes?lojaId=${encodeURIComponent(user.lojaId)}`, undefined, true), request<{ telefone?: string }>('/loja')]).then(([o, l, f, s]) => {
      if (!active) return;
      if (o.status === 'fulfilled') setOrders(Array.isArray(o.value) ? o.value : o.value.pedidos ?? []);
      if (l.status === 'fulfilled') setPoints(l.value);
      if (f.status === 'fulfilled') setOffers(Array.isArray(f.value) ? f.value : f.value.promocoes ?? []);
      if (s.status === 'fulfilled') setPhone(s.value.telefone || '');
      setFailed(([['pedidos', o], ['pontos', l], ['ofertas', f]] as const).filter(([, r]) => r.status === 'rejected').map(([name]) => name));
      setLoading(false);
    });
    return () => { active = false; };
  }, [user, retry]));
  const open = async (text?: string) => { try { await Linking.openURL(whatsappUrl(phone, text || 'Olá!')); } catch { /* Phone unavailable: the store link stays visible. */ } };
  const current = orders.find(order => order.status !== 'ENTREGUE' && !order.canceladoEm) ?? null;
  const last = current ?? orders.find(order => !order.canceladoEm) ?? null;
  const rewards = points ? (points.recompensas ?? []).filter(r => (r.pontos ?? r.custo ?? 0) <= points.saldo).length : 0;
  const progress = points?.meta ? Math.min(100, Math.round(points.saldo / points.meta * 100)) : 0;
  const promo = offers[0];
  return <PanelScreen user={user} onLogout={onLogout}>
    <PageHeader title={`Olá, ${user.nome?.split(' ')[0] || 'cliente'}!`} description="Seus pedidos e benefícios, em um só lugar."><HelpLink label="Falar com a loja" icon={<Icon.whatsapp size={20} color={P.royal} />} onPress={() => open()} /></PageHeader>
    {!loading && current && <NextAction title={current.status === 'PRONTO' ? 'Seu pedido está pronto' : 'Acompanhe seu pedido'} description={`${current.codigo ?? current.id}: ${STATUS[current.status] ?? current.status}. Veja os detalhes ou combine com a loja.`} action="Ver meu pedido" onPress={() => router.push({ pathname: '/pedidos', params: { pedido: current.id } })} />}
    {!loading && !last && !failed.includes('pedidos') && <NextAction title="Encontre seu próximo celular" description="Escolha na loja e fale com a equipe. Suas compras registradas aparecem aqui." action="Ver produtos" onPress={() => router.navigate('/loja')} />}
    <QuickActions items={[
      { label: 'Escolher aparelho', description: 'Orçamento, necessidades e comparação', icon: 'search', onPress: () => router.push('/assistente') },
      ...(!current ? [{ label: 'Consultar compras', description: 'Pedidos e detalhes da compra', icon: 'package' as const, onPress: () => router.push('/pedidos') }] : []),
      { label: 'Usar meus pontos', description: 'Saldo e recompensas juntos', icon: 'award', onPress: () => router.push('/beneficios') },
      { label: 'Ver ofertas', description: 'Oportunidades da loja', icon: 'tag', onPress: () => router.push({ pathname: '/beneficios', params: { aba: 'ofertas' } }) },
    ]} />
    {loading && <ActivityIndicator color={P.royal} accessibilityLabel="Carregando informações" />}
    {failed.length > 0 && <Notice action="Tentar novamente" onAction={() => { setLoading(true); setRetry(v => v + 1); }}>Não foi possível consultar {failed.join(', ')}.</Notice>}
    {!loading && <Disclosure title="Resumo da minha conta" subtitle="Compras, pontos e ofertas"><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      <MetricCard label="Meus pedidos" icon="package" value={failed.includes('pedidos') ? '—' : orders.length} description={failed.includes('pedidos') ? 'indisponível' : 'no histórico'} onPress={() => router.push('/pedidos')} />
      <MetricCard label="Pontos" icon="award" value={points?.saldo ?? '—'} description={points ? `nível ${points.nivel}` : 'indisponível'} onPress={() => router.push('/beneficios')} />
      <MetricCard label="Ofertas" icon="tag" value={failed.includes('ofertas') ? '—' : offers.length} description={failed.includes('ofertas') ? 'indisponível' : 'disponíveis'} onPress={() => router.push({ pathname: '/beneficios', params: { aba: 'ofertas' } })} />
      <MetricCard label="Recompensas" icon="gift" value={failed.includes('pontos') ? '—' : rewards} description={failed.includes('pontos') ? 'indisponível' : 'disponíveis'} onPress={() => router.push('/beneficios')} />
    </View></Disclosure>}
    {last?.status === 'ENTREGUE' && <Surface><View style={st.rowBetween}><Text style={[{ fontSize: 18, color: P.ink }, { fontFamily: 'BarlowCondensed_700Bold' }]}>Última compra</Text><Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/pedidos', params: { pedido: last.id } })}><Text style={panelText.link}>Acompanhar esta compra →</Text></Pressable></View>
      <Text style={[{ color: P.royal, fontSize: 16, marginVertical: 8 }, { fontFamily: 'BarlowCondensed_700Bold' }]}>{last.codigo ?? last.id}</Text>
      <Text style={panelText.muted}>{(last.itens ?? []).map(item => item.nome ?? item.produto?.nome ?? '').filter(Boolean).join(', ')}</Text>
      <View style={[st.rowBetween, { borderTopWidth: 1, borderTopColor: P.line, paddingTop: 12, marginTop: 12 }]}><Text style={panelText.muted}>{last.createdAt ? new Date(last.createdAt).toLocaleDateString('pt-BR') : ''}</Text><Text style={[{ fontSize: 18, color: P.ink }, { fontFamily: 'BarlowCondensed_700Bold' }]}>{money(Number(last.total))}</Text></View></Surface>}
    {points && <Surface><View style={st.rowBetween}><Text style={[{ fontSize: 18, color: P.ink }, { fontFamily: 'BarlowCondensed_700Bold' }]}>Programa de fidelidade</Text><Pressable accessibilityRole="link" onPress={() => router.push('/beneficios')} style={{ minHeight: 36, justifyContent: 'center' }}><Text style={[{ fontSize: 12, color: P.royal }, font()]}>Ver detalhes</Text></Pressable></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 12 }}><View style={st.award}><Icon.award size={24} color="#f59e0b" /></View><View><Text style={[{ fontSize: 26, color: P.ink }, { fontFamily: 'BarlowCondensed_700Bold' }]}>{points.saldo} <Text style={[{ fontSize: 14, color: '#71717a' }, font()]}>pontos</Text></Text><Text style={[{ fontSize: 12, color: '#71717a' }, font()]}>Nível {points.nivel}{points.meta ? ` · meta: ${points.meta} pts para ${points.proximoNivel}` : ''}</Text></View></View>
      {points.meta ? <><View style={st.track}><View style={[st.fill, { width: `${progress}%` }]} /></View><View style={[st.rowBetween, { marginTop: 6 }]}><Text style={[{ fontSize: 11, color: '#a1a1aa' }, font()]}>{points.saldo} pts</Text><Text style={[{ fontSize: 11, color: '#a1a1aa' }, font()]}>{points.meta} pts</Text></View></> : null}</Surface>}
    {promo && <Surface style={{ padding: 0, overflow: 'hidden' }}><View style={[st.rowBetween, { paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: P.line }]}><Text style={[{ fontSize: 18, color: P.ink }, { fontFamily: 'BarlowCondensed_700Bold' }]}>Oferta da loja</Text><Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/beneficios', params: { aba: 'ofertas' } })}><Text style={[{ fontSize: 12, color: P.royal }, font()]}>Ver todas</Text></Pressable></View>
      <View style={{ padding: 18 }}><View style={st.pill}><Icon.tag size={12} color={P.royal} /><Text style={[{ fontSize: 11, color: P.royal }, font(600)]}>OFERTA</Text></View><Text style={[{ fontSize: 20, color: P.ink, marginBottom: 4 }, { fontFamily: 'BarlowCondensed_700Bold' }]}>{promo.titulo}</Text><Text style={[panelText.muted, { marginBottom: 12 }]}>{promo.desc ?? promo.descricao}</Text>
        {promo.preco ? <View style={st.rowBetween}><View>{promo.precoOriginal ? <Text style={[{ fontSize: 13, color: '#a1a1aa', textDecorationLine: 'line-through' }, font()]}>{money(promo.precoOriginal)}</Text> : null}<Text style={[{ fontSize: 28, color: P.ink }, { fontFamily: 'BarlowCondensed_700Bold' }]}>{money(promo.preco)}</Text></View>
          <Pressable accessibilityRole="link" onPress={() => open(`Olá! Vi a promoção exclusiva: ${promo.titulo} por ${money(promo.preco!)}`)} style={st.offerButton}><Icon.whatsapp size={16} color="#fff" /><Text style={[{ color: '#fff', fontSize: 13 }, font(600)]}>Quero essa oferta</Text></Pressable></View> : null}</View></Surface>}
    <View style={{ marginTop: 8 }}><EmailVerification key={user.id} /></View>
  </PanelScreen>;
}

export default function Account() {
  const [user, setUser] = useState<NativeUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      try { if (await hasSavedSession()) { const profile = await request<NativeUser>('/auth/me', undefined, true); if (active) setUser(profile); } else if (active) setUser(null); }
      catch (e) { if (active) setError(e instanceof Error ? e.message : 'Não foi possível recuperar a sessão.'); }
      finally { if (active) setChecking(false); }
    })();
    return () => { active = false; };
  }, []));
  async function exit() {
    setError('');
    try { await logout(); }
    catch { setError('Você saiu neste aparelho, mas a rede não confirmou a remoção do acesso. Desative as notificações nas configurações do aparelho e encerre a sessão pela sua conta quando estiver online.'); }
    finally { setUser(null); }
  }
  if (checking) return <View style={{ flex: 1, backgroundColor: P.paper, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={P.royal} accessibilityLabel="Consultando sua conta" /></View>;
  return <View style={{ flex: 1 }}>
    {error ? <View style={{ position: 'absolute', zIndex: 2, left: 16, right: 16, bottom: 16 }}><Notice tone="error">{error}</Notice></View> : null}
    {user ? <CustomerHome user={user} onLogout={exit} /> : <Login onSignedIn={setUser} />}
  </View>;
}

const st = StyleSheet.create({
  authHeader: { alignItems: 'flex-start', paddingHorizontal: 24, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: P.line },
  card: { width: '100%', maxWidth: 460, alignSelf: 'center', padding: 32, backgroundColor: '#fff', borderWidth: 1, borderColor: P.line, borderRadius: 24, shadowColor: '#10243e', shadowOpacity: 0.04, shadowRadius: 25, shadowOffset: { width: 0, height: 16 }, elevation: 2 },
  label: { fontSize: 13, color: '#3f3f46', marginBottom: 6, fontFamily: 'DMSans_500Medium' },
  input: { minHeight: 50, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: P.paper, borderWidth: 1, borderColor: P.line, borderRadius: 12, fontSize: 14, color: P.ink, marginBottom: 16, fontFamily: 'DMSans_400Regular' },
  eye: { position: 'absolute', right: 4, top: 0, width: 44, height: 50, alignItems: 'center', justifyContent: 'center' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, marginBottom: 16 },
  submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 12, backgroundColor: P.royal },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  award: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#fffbeb', alignItems: 'center', justifyContent: 'center' },
  track: { height: 8, borderRadius: 99, backgroundColor: '#f4f4f5', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99, backgroundColor: '#f59e0b' },
  pill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: P.royal50, marginBottom: 12 },
  offerButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, height: 44, borderRadius: 99, backgroundColor: '#059669' },
});
