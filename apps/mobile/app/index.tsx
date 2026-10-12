import FavoriteButton from '../src/FavoriteButton';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { request, assetUrl } from '../src/api';
import { Link } from 'expo-router';
type Product = { id: string; nome: string; sub: string; preco: number; estoque: number; imgUrl: string };
export default function Catalog() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    request<{ id: string }>('/loja').then(store => request<Product[]>(`/produtos?lojaId=${encodeURIComponent(store.id)}`)).then(rows => { if (active) { setProducts(rows); setError(''); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [reload]);
  return <View style={styles.screen}>
    <Link href="/conta" style={{ color: '#0036cc', paddingVertical: 14 }}>Minha conta e pedidos</Link>
    <Link href="/ajuda" style={{ color: '#0036cc', paddingVertical: 14 }}>Ajuda com sua operadora</Link>
    <Text accessibilityRole="header" style={styles.heading}>Encontre seu próximo aparelho</Text><Text style={styles.subtitle}>Produtos e preços atuais da Vox.</Text>
    {error ? <View accessibilityLiveRegion="polite"><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setReload(value => value + 1)} style={styles.button}><Text style={styles.buttonText}>Tentar novamente</Text></Pressable></View> : products === null ? <ActivityIndicator size="large" color="#0036cc" accessibilityLabel="Carregando catálogo" /> : <FlatList data={products} keyExtractor={item => item.id} contentContainerStyle={{ paddingBottom: 24 }} ListEmptyComponent={<Text>Nenhum produto disponível no catálogo.</Text>} renderItem={({ item }) => <View style={styles.card}><Image source={{ uri: assetUrl(item.imgUrl) }} accessibilityLabel={item.nome} style={styles.image} resizeMode="contain" /><Text style={styles.name}>{item.nome}</Text><Text style={styles.subtitle}>{item.sub}</Text><Text style={styles.price}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco)}</Text><Text>{item.estoque > 0 ? 'Disponível na loja' : 'Sem estoque no momento'}</Text><FavoriteButton productId={item.id} /></View>} />}
  </View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, padding: 20 }, heading: { fontSize: 26, fontWeight: '700', color: '#10243e', marginBottom: 8 }, subtitle: { color: '#52647b', marginBottom: 12 }, card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#dce4f3', padding: 20, marginBottom: 16 }, image: { height: 180, width: '100%', marginBottom: 12 }, name: { fontSize: 18, fontWeight: '700', color: '#10243e', marginBottom: 6 }, price: { fontSize: 22, fontWeight: '700', color: '#0036cc', marginBottom: 8 }, error: { color: '#9c1230', marginBottom: 16 }, button: { minHeight: 48, backgroundColor: '#0036cc', borderRadius: 12, padding: 14 }, buttonText: { color: '#fff', fontWeight: '700' } });
