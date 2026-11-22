// Product sheet from the PWA (components/ProductModal.jsx): image, details, compatibility, price, quantity and WhatsApp.
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { request, assetUrl } from '../src/api';
import { changeCart, readCart } from '../src/cart';
import FavoriteButton from '../src/FavoriteButton';
import { whatsappUrl } from '../src/storeContact';
import { Icon } from '../src/icons';
import { C, brandIcon, display, font, money, Message } from '../src/ui';

type Product = { id: string; lojaId: string; nome: string; sub: string; categoria: string; preco: number; precoOriginal?: number | null; badge?: string | null; estoque: number; imgUrl: string; descricao: string; specs: string[] };
type Compatibility = { id: string; observacao: string; aprovadoEm: string; acessorio: { id: string; nome: string }; aparelho: { id: string; nome: string } };

export default function ProductDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const productId = typeof id === 'string' ? id : '';
  const [product, setProduct] = useState<Product | null>(null);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [pairs, setPairs] = useState<Compatibility[] | null>(null);
  const [pairError, setPairError] = useState('');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [notice, setNotice] = useState('');
  const busy = useRef(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    setProduct(null); setError(''); setPairs(null); setPairError(''); setQty(1); setAdded(false); setNotice('');
    if (!productId || productId.length > 200) { setError('Escolha um produto no catálogo.'); return; }
    request<{ id: string; telefone?: string }>('/loja').then(store => { if (active) setPhone(store.telefone || ''); return request<Product>(`/produtos/${encodeURIComponent(productId)}?lojaId=${encodeURIComponent(store.id)}`); })
      .then(async row => {
        if (!active) return;
        setProduct(row);
        try { const data = await request<Compatibility[]>(`/compatibilidades?lojaId=${encodeURIComponent(row.lojaId)}&produtoId=${encodeURIComponent(row.id)}`); if (active) setPairs(data); }
        catch (e) { if (active) setPairError(e instanceof Error ? e.message : 'Não foi possível consultar compatibilidade.'); }
      }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível consultar o produto.'); });
    return () => { active = false; };
  }, [productId, reload]));
  async function add() {
    if (!product || product.estoque <= 0 || busy.current) return;
    busy.current = true; setNotice('');
    try {
      const cart = await readCart();
      const current = cart.storeId === product.lojaId ? cart.items.find(item => item.produtoId === product.id)?.qty || 0 : 0;
      if (cart.items.length && cart.storeId !== product.lojaId) throw new Error('Seu carrinho pertence a outra loja.');
      if (current + qty > product.estoque) throw new Error('Não há estoque para essa quantidade.');
      await changeCart(product.lojaId, product.id, current + qty);
      setAdded(true);
      setTimeout(() => { setAdded(false); if (router.canGoBack()) router.back(); }, 900);
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Não foi possível adicionar.'); }
    finally { busy.current = false; }
  }
  async function ask() {
    if (!product) return;
    try { await Linking.openURL(whatsappUrl(phone, `Olá! Tenho interesse em: ${product.nome} (${money(product.preco)})`)); }
    catch (e) { setNotice(e instanceof Error ? e.message : 'Não foi possível abrir o WhatsApp.'); }
  }
  const close = () => router.canGoBack() ? router.back() : router.replace('/loja');
  if (error || !product) return <View style={[st.screen, { paddingTop: insets.top + 16, padding: 20 }]}>
    {error ? <Message tone="error" action="Tentar novamente" onAction={() => setReload(v => v + 1)}>{error}</Message> : <ActivityIndicator color={C.blue} accessibilityLabel="Carregando produto" />}
    <Pressable accessibilityRole="button" onPress={close} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[{ color: C.blue }, font(600)]}>Voltar à loja</Text></Pressable>
  </View>;
  const discount = product.precoOriginal ? Math.round((1 - product.preco / product.precoOriginal) * 100) : 0;
  return <ScrollView style={st.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
    <View style={st.imageBox}>
      <Image source={product.imgUrl ? { uri: assetUrl(product.imgUrl) } : brandIcon} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={product.nome} />
      {product.badge ? <View style={st.badge}><Text style={[{ fontSize: 10, letterSpacing: 1.8, color: C.white }, display(700)]}>{product.badge}</Text></View> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar detalhes do produto" onPress={close} style={[st.close, { top: insets.top + 12 }]}><Icon.close size={20} color={C.ink} /></Pressable>
    </View>
    <View style={{ padding: 28 }}>
      <Text style={[st.kicker, display(600)]}>{product.categoria.toUpperCase()}</Text>
      <Text accessibilityRole="header" style={[st.name, display(700)]}>{product.nome}</Text>
      {product.sub ? <Text style={[{ fontSize: 13, color: '#71717a', marginTop: 4 }, font()]}>{product.sub}</Text> : null}
      {product.descricao ? <Text style={[st.desc, font()]}>{product.descricao}</Text> : null}
      <View style={st.compat} accessibilityLabel="Compatibilidade conferida pela loja">
        <Text style={[{ fontSize: 14, color: C.text }, font(600)]}>Compatibilidade conferida pela loja</Text>
        {pairError ? <Text accessibilityRole="alert" style={[st.small, { color: '#b91c1c' }]}>{pairError}</Text>
          : pairs === null ? <Text style={st.small}>Consultando compatibilidade…</Text>
          : !pairs.length ? <Text style={st.small}>Compatibilidade não informada. Confirme com a loja antes de escolher um acessório.</Text>
          : pairs.map(pair => { const related = pair.acessorio.id === product.id ? pair.aparelho : pair.acessorio; return <View key={pair.id} style={{ marginTop: 12 }}>
            <Text style={[{ fontSize: 14, color: C.text }, font(600)]}>{related.nome}</Text><Text style={st.small}>{pair.observacao}</Text>
            <Text style={[st.small, { fontSize: 12 }]}>Conferido em {new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(pair.aprovadoEm))}</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/produto', params: { id: related.id } })} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[{ color: '#1d4ed8', textDecorationLine: 'underline', fontSize: 14 }, font()]}>Ver produto</Text></Pressable>
          </View>; })}
      </View>
      <FavoriteButton productId={product.id} />
      {product.specs?.length ? <View style={st.specs}>{product.specs.slice(0, 12).map((spec, index) => <View key={index} style={st.spec}><View style={st.dot} /><Text style={[{ flex: 1, fontSize: 12, color: '#3f3f46' }, font(500)]}>{spec}</Text></View>)}</View> : null}
      <View style={st.priceBox}>
        {product.precoOriginal || discount > 0 ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          {product.precoOriginal ? <Text style={[{ fontSize: 14, color: '#a1a1aa', textDecorationLine: 'line-through' }, font()]}>{money(product.precoOriginal)}</Text> : null}
          {discount > 0 ? <Text style={[st.off, display(700)]}>-{discount}%</Text> : null}
        </View> : null}
        <Text style={[st.price, display(700)]}>{money(product.preco)}</Text>
        <Text style={[{ fontSize: 12, color: '#52525b', marginBottom: 20 }, font()]}>ou <Text style={[{ color: C.royal }, font(600)]}>12x de {money(product.preco / 12)}</Text> sem juros</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={st.stepper}>
            <Pressable accessibilityRole="button" accessibilityLabel="Diminuir quantidade" onPress={() => setQty(q => Math.max(1, q - 1))} style={st.step}><Icon.minus size={16} color={C.ink} /></Pressable>
            <Text accessibilityLabel={`${qty} unidades`} style={[{ width: 40, textAlign: 'center', fontSize: 17, color: C.ink }, display(700)]}>{qty}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Aumentar quantidade" onPress={() => setQty(q => Math.max(1, Math.min(product.estoque, q + 1)))} style={st.step}><Icon.plus size={16} color={C.ink} /></Pressable>
          </View>
          <Pressable accessibilityRole="button" disabled={product.estoque <= 0} onPress={add} style={[st.add, added && { backgroundColor: C.green }, product.estoque <= 0 && { opacity: 0.5 }]}>
            {added ? <><Icon.check size={20} color={C.white} /><Text style={[st.addText, font(600)]}>Adicionado</Text></> : <Text style={[st.addText, font(600)]}>{product.estoque > 0 ? `Adicionar — ${money(product.preco * qty)}` : 'Indisponível'}</Text>}
          </Pressable>
        </View>
        {notice ? <Text accessibilityRole="alert" style={[st.small, { color: '#b91c1c' }]}>{notice}</Text> : null}
        <Pressable accessibilityRole="link" onPress={ask} style={st.whats}><Icon.whatsapp size={16} color="#047857" /><Text style={[{ fontSize: 13, color: '#047857', letterSpacing: 0.3 }, font(600)]}>Tirar dúvida pelo WhatsApp</Text></Pressable>
        <Text style={[{ fontSize: 11, color: '#71717a', textAlign: 'center', marginTop: 12 }, font()]}>{product.estoque <= 0 ? 'Sem estoque no momento' : product.estoque <= 5 ? `Apenas ${product.estoque} em estoque` : `${product.estoque} unidades em estoque`}</Text>
      </View>
    </View>
  </ScrollView>;
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.white },
  imageBox: { width: '100%', aspectRatio: 1, backgroundColor: '#F7F7F5' },
  badge: { position: 'absolute', top: 16, left: 16, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: C.red },
  close: { position: 'absolute', right: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  kicker: { fontSize: 10, letterSpacing: 2.2, color: C.red, marginBottom: 4 },
  name: { fontSize: 28, lineHeight: 31, color: '#0A0E27' },
  desc: { fontSize: 14, lineHeight: 23, color: '#52525b', marginTop: 12, marginBottom: 20 },
  compat: { marginBottom: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 16 },
  small: { marginTop: 8, fontSize: 14, lineHeight: 20, color: '#475569', fontFamily: 'DMSans_400Regular' },
  specs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  spec: { width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F7F7F5', borderWidth: 1, borderColor: '#E7E4DD', borderRadius: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.royal },
  priceBox: { borderTopWidth: 1, borderTopColor: '#E7E4DD', paddingTop: 20 },
  off: { backgroundColor: C.red, color: C.white, fontSize: 10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  price: { fontSize: 40, lineHeight: 42, color: '#0A0E27', marginBottom: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E7E4DD', borderRadius: 999, overflow: 'hidden' },
  step: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  add: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: C.royal, minHeight: 48 },
  addText: { color: C.white, fontSize: 14, letterSpacing: 0.3 },
  whats: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, borderWidth: 1, borderColor: C.green, borderRadius: 999 },
});
