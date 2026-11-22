// Two-column product card from the PWA (.customer-app-product).
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { assetUrl } from './api';
import { addToCart } from './cart';
import { Icon } from './icons';
import { C, brandIcon, font, money } from './ui';

export type CatalogItem = { id: string; lojaId: string; nome: string; sub?: string; categoria: string; preco: number; estoque: number; imgUrl?: string };

export default function ProductCard({ product, onNotice, offline }: { product: CatalogItem; onNotice: (text: string) => void; offline?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const available = product.estoque > 0 && !offline;
  async function add() {
    if (busy) return;
    setBusy(true);
    try { await addToCart(product.lojaId, product.id, product.estoque); onNotice(`${product.nome} adicionado ao carrinho.`); }
    catch (e) { onNotice(e instanceof Error ? e.message : 'Não foi possível adicionar.'); }
    finally { setBusy(false); }
  }
  return <View style={st.card}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Ver ${product.nome}`} onPress={() => router.push({ pathname: '/produto', params: { id: product.id } })} style={{ flex: 1 }}>
      <View style={st.imageBox}><Image source={product.imgUrl ? { uri: assetUrl(product.imgUrl) } : brandIcon} style={st.image} resizeMode="contain" accessibilityLabel={product.nome} /></View>
      <Text style={[st.name, font(600)]} numberOfLines={2}>{product.nome}</Text>
      <Text style={[st.sub, font()]} numberOfLines={2}>{product.sub || product.categoria}</Text>
      <Text style={[st.price, font(700)]}>{money(product.preco)}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" disabled={busy || !available} onPress={add} style={[st.add, !available && st.addOff]}>
      <Text style={[{ fontSize: 12, color: available ? C.blue : '#8792a5' }, font(700)]}>{offline ? 'Confirmar online' : available ? 'Adicionar' : 'Indisponível'}</Text>
      <Icon.cart size={17} color={available ? C.blue : '#8792a5'} />
    </Pressable>
  </View>;
}

export function ProductGrid({ products, onNotice, offline }: { products: CatalogItem[]; onNotice: (text: string) => void; offline?: boolean }) {
  const rows: CatalogItem[][] = [];
  for (let i = 0; i < products.length; i += 2) rows.push(products.slice(i, i + 2));
  return <View style={{ gap: 12 }}>{rows.map(row => <View key={row[0].id} style={{ flexDirection: 'row', gap: 12 }}>
    {row.map(product => <ProductCard key={product.id} product={product} onNotice={onNotice} offline={offline} />)}{row.length === 1 && <View style={{ flex: 1 }} />}
  </View>)}</View>;
}

const st = StyleSheet.create({
  card: { flex: 1, minWidth: 0, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 10, overflow: 'hidden' },
  imageBox: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper, borderRadius: 13, marginBottom: 12 },
  image: { width: '85%', height: '85%' },
  name: { fontSize: 14, lineHeight: 19, color: C.text, marginHorizontal: 2, marginBottom: 5 },
  sub: { fontSize: 11, lineHeight: 15, color: C.muted2, marginHorizontal: 2, marginBottom: 10 },
  price: { fontSize: 17, letterSpacing: -0.5, color: C.ink, marginTop: 'auto', marginHorizontal: 2, marginBottom: 12 },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 42, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 12, backgroundColor: C.blueSoft },
  addOff: { backgroundColor: '#f0f2f5' },
});
