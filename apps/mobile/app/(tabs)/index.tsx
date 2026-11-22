// Home from the PWA (/app): greeting, discovery banner, shortcuts and featured products.
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { hasSavedSession, request, type NativeUser } from '../../src/api';
import { loadCatalog } from '../../src/offlineCatalog';
import { filterCatalog } from '../../src/catalog';
import { ProductGrid, type CatalogItem } from '../../src/ProductCard';
import { Icon } from '../../src/icons';
import { AppHeader, C, Heading, Message, font } from '../../src/ui';

const shortcuts: [Href, string, keyof typeof Icon][] = [['/novidades', 'Novidades', 'tag'], ['/servicos', 'Serviços', 'headphones'], ['/pedidos', 'Pedidos', 'package'], ['/beneficios', 'Ofertas', 'gift']];

export default function Home() {
  const router = useRouter();
  const bannerWidth = Math.min(useWindowDimensions().width, 900) - 40;
  const [name, setName] = useState('');
  const [products, setProducts] = useState<CatalogItem[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    hasSavedSession().then(saved => saved ? request<NativeUser>('/auth/me', undefined, true) : null).then(user => { if (active) setName(user?.nome?.split(' ')[0] || ''); }).catch(() => {});
    return () => { active = false; };
  }, []));
  useEffect(() => {
    let active = true;
    loadCatalog().then(result => { if (active) { setProducts(result.products); setOffline(Boolean(result.savedAt)); setError(''); } }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível consultar o catálogo.'); });
    return () => { active = false; };
  }, [reload]);
  const shown = filterCatalog(products || []).slice(0, 4);
  return <View style={{ flex: 1, backgroundColor: C.bg }}>
    <AppHeader />
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
      <Heading title={`Olá${name ? `, ${name}` : ''}!`} subtitle="O que você precisa hoje?" />
      <Pressable accessibilityRole="link" accessibilityLabel="Qual aparelho combina com você? Descobrir" onPress={() => router.push('/assistente')} style={st.banner}>
        <Image source={require('../../assets/brand/assistant-mobile.jpg')} style={[st.art, { width: bannerWidth, height: bannerWidth * 2 / 3 }]} resizeMode="cover" />
        <View style={{ width: '52%' }}>
          <Text style={[st.kicker, font(700)]}>✦ VOX DISCOVERY</Text>
          <Text style={[st.bannerTitle, font(700)]}>Qual aparelho combina com você?</Text>
          <Text style={[st.bannerText, font()]}>Seu estilo. Seu próximo match.</Text>
          <View style={st.cta}><Text style={[{ color: C.yellowInk, fontSize: 12 }, font(700)]}>Descobrir</Text><Icon.arrowRight size={15} color={C.yellowInk} /></View>
        </View>
      </Pressable>
      <Pressable accessibilityRole="link" onPress={() => router.push('/descobertas')} style={st.discoveries}>
        <Text style={[{ color: C.blue, fontSize: 12 }, font(700)]}>✦ Minhas descobertas</Text><Text style={{ color: C.blue }}>→</Text>
      </Pressable>
      <View style={st.shortcuts}>{shortcuts.map(([to, label, icon]) => { const I = Icon[icon]; return <Pressable key={label} accessibilityRole="link" onPress={() => router.push(to)} style={st.shortcut}><I size={23} color={C.blue} /><Text style={[{ fontSize: 12, color: '#23324c' }, font(600)]}>{label}</Text></Pressable>; })}</View>
      <View style={st.sectionHead}><Text accessibilityRole="header" style={[{ fontSize: 20, color: C.text }, font(700)]}>Na loja</Text><Pressable accessibilityRole="link" onPress={() => router.navigate('/loja')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[{ color: C.blue, fontSize: 13 }, font(700)]}>Ver todos</Text></Pressable></View>
      {error ? <Message tone="error" action="Tentar novamente" onAction={() => { setError(''); setProducts(null); setReload(v => v + 1); }}>{error}</Message>
        : products === null ? <Message>Carregando produtos…</Message> : null}
      {notice ? <Message>{notice}</Message> : null}
      {products && !error && (shown.length ? <ProductGrid products={shown} onNotice={setNotice} offline={offline} /> : <Message>Nenhum produto publicado no momento.</Message>)}
    </ScrollView>
  </View>;
}

const st = StyleSheet.create({
  banner: { overflow: 'hidden', flexDirection: 'row', alignItems: 'center', aspectRatio: 3 / 2, padding: 22, borderRadius: 26, backgroundColor: C.blue, shadowColor: C.blue, shadowOpacity: 0.13, shadowRadius: 15, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
  art: { position: 'absolute', top: 0, left: 0 },
  kicker: { fontSize: 9, letterSpacing: 1.1, color: '#cbdcff' },
  bannerTitle: { fontSize: 21, lineHeight: 24, letterSpacing: -0.6, color: C.white, marginVertical: 12 },
  bannerText: { fontSize: 11, lineHeight: 16, color: '#e1e9ff', maxWidth: 150, marginBottom: 16 },
  cta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: C.yellow, borderWidth: 1, borderColor: C.yellowLine, borderBottomWidth: 3, borderBottomColor: C.yellowShadow },
  discoveries: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginTop: 8, marginHorizontal: 4 },
  shortcuts: { flexDirection: 'row', gap: 8, marginTop: 22, marginBottom: 28 },
  shortcut: { flex: 1, alignItems: 'center', gap: 9, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
});
