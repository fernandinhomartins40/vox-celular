// Cart from the PWA drawer (components/CartDrawer.jsx); server confirmation and pending-checkout safety from src/cart.ts.
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { assetUrl, hasSavedSession, request } from '../src/api';
import { Cart, changeCart, confirmCart, readCart, Receipt } from '../src/cart';
import { whatsappUrl } from '../src/storeContact';
import { Icon } from '../src/icons';
import { C, brandIcon, display, font, money, PrimaryButton } from '../src/ui';

type Product = { id: string; nome: string; sub?: string; preco: number; estoque: number; imgUrl?: string };

export default function ShoppingCart() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cart, setCart] = useState<Cart | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [phone, setPhone] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [reload, setReload] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError('');
    (async () => {
      const [saved, session, store] = await Promise.all([readCart(), hasSavedSession().catch(() => false), request<{ id: string; telefone?: string }>('/loja').catch(() => null)]);
      if (active) { setCart(saved); setSignedIn(session); setPhone(store?.telefone || ''); }
      const rows = saved.storeId ? await request<Product[]>(`/produtos?lojaId=${encodeURIComponent(saved.storeId)}`) : [];
      if (active) setProducts(rows);
    })().catch(e => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível consultar o carrinho.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]));
  const rows = (cart?.items || []).map(item => ({ ...item, product: products.find(product => product.id === item.produtoId) }));
  const unitCents = (row: typeof rows[number]) => cart?.pending?.itens.find(item => item.produtoId === row.produtoId)?.precoCentavos ?? Math.round((row.product?.preco || 0) * 100);
  const unavailable = rows.some(row => !row.product || row.product.estoque < row.qty);
  const total = rows.reduce((sum, row) => sum + row.qty * unitCents(row), 0) / 100;
  async function quantity(id: string, qty: number) {
    if (!cart || busy || cart.pending) return;
    setBusy(true); setError('');
    try { setCart(await changeCart(cart.storeId, id, qty)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível ajustar.'); }
    finally { setBusy(false); }
  }
  async function confirm() {
    if (!cart || busy) return;
    setBusy(true); setError('');
    try {
      const result = await confirmCart(rows.map(row => ({ produtoId: row.produtoId, qty: row.qty, precoCentavos: Math.round((row.product?.preco || 0) * 100) })));
      setReceipt(result); setCart({ storeId: '', items: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível confirmar. Verifique a conexão e tente novamente.');
      try { setCart(await readCart()); } catch { /* Keep visible cart and original failure. */ }
    } finally { setBusy(false); }
  }
  async function help() {
    const lines = rows.map(row => `• ${row.qty}x ${row.product?.nome || 'Produto'} — ${money(row.qty * unitCents(row) / 100)}`).join('\n');
    try { await Linking.openURL(whatsappUrl(phone, `Olá Vox Celular! Quero finalizar o pedido:\n\n${lines}\n\n*Total: ${money(total)}*\n\nPago via:`)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível abrir o WhatsApp.'); }
  }
  const close = () => router.canGoBack() ? router.back() : router.replace('/');
  return <View style={{ flex: 1, backgroundColor: C.white, paddingTop: insets.top }}>
    <View style={st.head}>
      <View><Text style={[st.kicker, display(700)]}>SEU PEDIDO</Text><Text accessibilityRole="header" style={[st.title, display(700)]}>Carrinho ({rows.length})</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar carrinho" onPress={close} style={st.close}><Icon.close size={20} color={C.ink} /></Pressable>
    </View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 12 }}>
      {loading && <ActivityIndicator color={C.blue} accessibilityLabel="Carregando carrinho" />}
      {receipt && <View accessibilityLiveRegion="polite" style={st.success}><Text style={[{ fontSize: 15, color: '#065f46' }, font(700)]}>Pedido {receipt.codigo} registrado</Text><Text style={[{ fontSize: 14, color: '#065f46', marginVertical: 6 }, font()]}>Pagamento aguardando confirmação da loja.</Text><Pressable accessibilityRole="link" onPress={() => router.replace({ pathname: '/pedidos', params: { pedido: receipt.id } })} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[{ color: C.blue, textDecorationLine: 'underline' }, font(600)]}>Acompanhar meu pedido</Text></Pressable></View>}
      {cart?.pending && <Text style={[{ color: '#92400e', fontSize: 14, lineHeight: 20 }, font()]}>Existe uma confirmação pendente. Use a mesma conta para verificar o resultado; repetir não gera outro pedido.</Text>}
      {!loading && !receipt && !rows.length && <View style={st.empty}>
        <View style={st.emptyIcon}><Icon.cart size={28} color="#a1a1aa" /></View>
        <Text style={[{ fontSize: 18, color: '#3f3f46' }, display(700)]}>Seu carrinho está vazio</Text>
        <Text style={[{ fontSize: 13, color: '#71717a', marginTop: 4 }, font()]}>Escolha os produtos para montar seu pedido.</Text>
      </View>}
      {rows.map(row => { const name = row.product?.nome || 'Produto indisponível no catálogo'; const stock = row.product?.estoque || 0; return <View key={row.produtoId} style={st.item}>
        <View style={st.thumb}><Image source={row.product?.imgUrl ? { uri: assetUrl(row.product.imgUrl) } : brandIcon} style={{ width: '100%', height: '100%' }} resizeMode="cover" /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[{ fontSize: 15, color: '#0A0E27' }, display(700)]}>{name}</Text>
          <Text numberOfLines={1} style={[{ fontSize: 11, color: '#71717a', marginBottom: 8 }, font()]}>{row.product?.sub || ''}</Text>
          {!cart?.pending && (!row.product || stock < row.qty) && <Text style={[{ fontSize: 12, color: '#b91c1c', marginBottom: 6 }, font()]}>Indisponível ou estoque insuficiente. Ajuste ou remova.</Text>}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={st.stepper}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Diminuir quantidade de ${name}`} disabled={busy || Boolean(cart?.pending)} onPress={() => quantity(row.produtoId, row.qty - 1)} style={st.step}><Icon.minus size={14} color={C.ink} /></Pressable>
              <Text accessibilityLabel={`${row.qty} unidades`} style={[{ width: 28, textAlign: 'center', fontSize: 14, color: C.ink }, display(700)]}>{row.qty}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Aumentar quantidade de ${name}`} disabled={busy || Boolean(cart?.pending) || row.qty >= Math.min(100, stock)} onPress={() => quantity(row.produtoId, row.qty + 1)} style={[st.step, row.qty >= Math.min(100, stock) && { opacity: 0.4 }]}><Icon.plus size={14} color={C.ink} /></Pressable>
            </View>
            <Text style={[{ fontSize: 15, color: '#0A0E27' }, display(700)]}>{money(row.qty * unitCents(row) / 100)}</Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remover ${name}`} disabled={busy || Boolean(cart?.pending)} onPress={() => quantity(row.produtoId, 0)} style={st.trash}><Icon.trash size={16} color="#a1a1aa" /></Pressable>
      </View>; })}
    </ScrollView>
    {rows.length > 0 && <View style={[st.foot, { paddingBottom: insets.bottom + 20 }]}>
      {error ? <Text accessibilityRole="alert" style={[{ color: '#dc2626', marginBottom: 12 }, font()]}>{error}</Text> : null}
      <View style={st.line}><Text style={[{ fontSize: 13, color: '#52525b' }, font()]}>Subtotal</Text><Text style={[{ fontSize: 15, color: C.ink }, display(700)]}>{money(total)}</Text></View>
      <View style={[st.line, { marginBottom: 14 }]}><Text style={[{ fontSize: 19, color: '#0A0E27' }, display(700)]}>Total</Text><Text style={[{ fontSize: 32, color: '#0A0E27' }, display(700)]}>{money(total)}</Text></View>
      <Text style={[{ fontSize: 14, lineHeight: 20, color: '#52525b', marginBottom: 12 }, font()]}>Confira os itens e o total. A loja combinará o pagamento e a entrega após receber seu pedido.</Text>
      {signedIn ? <PrimaryButton label={busy ? 'Registrando pedido…' : cart?.pending ? 'Verificar confirmação pendente' : 'Confirmar pedido'} onPress={confirm} disabled={busy || (!cart?.pending && unavailable)} />
        : <PrimaryButton label="Entrar para confirmar pedido" onPress={() => router.navigate('/conta')} />}
      <Pressable accessibilityRole="link" onPress={help} style={st.whats}><Icon.whatsapp size={20} color="#047857" /><Text style={[{ fontSize: 15, color: '#047857' }, font(600)]}>Preciso de ajuda pelo WhatsApp</Text></Pressable>
      <Text style={[{ fontSize: 11, color: '#71717a', textAlign: 'center', marginTop: 12 }, font()]}>O pedido será registrado após a confirmação. O pagamento será combinado com a loja.</Text>
    </View>}
    {!rows.length && error ? <Text accessibilityRole="alert" style={[{ color: '#dc2626', padding: 20 }, font()]}>{error}</Text> : null}
    {!loading && !rows.length && !receipt ? <Pressable accessibilityRole="button" onPress={() => setReload(v => v + 1)} style={{ minHeight: 44, alignItems: 'center', marginBottom: insets.bottom + 12 }}><Text style={[{ color: C.blue }, font(600)]}>Atualizar carrinho</Text></Pressable> : null}
  </View>;
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, borderBottomWidth: 1, borderBottomColor: '#E7E4DD' },
  kicker: { fontSize: 10, letterSpacing: 2.5, color: C.red },
  title: { fontSize: 26, lineHeight: 28, color: '#0A0E27', marginTop: 4 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  success: { padding: 16, borderRadius: 14, backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0' },
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  item: { flexDirection: 'row', gap: 12, padding: 12, borderWidth: 1, borderColor: '#E7E4DD', borderRadius: 12, backgroundColor: C.white },
  thumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#F7F7F5', overflow: 'hidden' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E7E4DD', borderRadius: 999, overflow: 'hidden' },
  step: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  trash: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  foot: { padding: 24, borderTopWidth: 1, borderTopColor: '#E7E4DD', backgroundColor: '#F7F7F5' },
  line: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 },
  whats: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderWidth: 1, borderColor: C.green, borderRadius: 999 },
});
