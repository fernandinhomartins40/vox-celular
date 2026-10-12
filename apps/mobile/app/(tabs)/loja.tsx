import CartButton from '../../src/CartButton';
import FavoriteButton from '../../src/FavoriteButton';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { request, assetUrl } from '../../src/api';
import { Link } from 'expo-router';
type Product = { id: string; lojaId: string; nome: string; sub: string; categoria: string; preco: number; estoque: number; imgUrl: string };
export default function Catalog() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const categories = useMemo(() => [...new Set((products || []).map(product => product.categoria))].sort(), [products]);
  const filtered = useMemo(() => (products || []).filter(product => (!category || product.categoria === category) && normalize(`${product.nome} ${product.sub} ${product.categoria}`).includes(normalize(search.trim()))), [products, search, category]);
  useEffect(() => {
    let active = true;
    request<{ id: string }>('/loja').then(store => request<Product[]>(`/produtos?lojaId=${encodeURIComponent(store.id)}`)).then(rows => { if (active) { setProducts(rows); setError(''); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [reload]);
  return <View style={styles.screen}>
    {error ? <View accessibilityLiveRegion="polite"><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setReload(value => value + 1)} style={styles.button}><Text style={styles.buttonText}>Tentar novamente</Text></Pressable></View> : products === null ? <ActivityIndicator size="large" color="#0036cc" accessibilityLabel="Carregando catálogo" /> : <FlatList data={filtered} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }} ListHeaderComponent={<View><Text accessibilityRole="header" style={styles.heading}>Encontre seu próximo aparelho</Text><Text style={styles.subtitle}>Produtos e preços atuais da Vox.</Text><TextInput accessibilityLabel="Buscar produto ou categoria" value={search} onChangeText={setSearch} placeholder="Buscar produto ou categoria" autoCorrect={false} maxLength={100} style={{ borderWidth: 1, borderColor: '#dce4f3', backgroundColor: '#fff', borderRadius: 12, minHeight: 48, padding: 12, fontSize: 16, marginBottom: 12 }} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>{['', ...categories].map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: category === value }} onPress={() => setCategory(value)} style={{ minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: category === value ? '#0036cc' : '#fff' }}><Text style={{ color: category === value ? '#fff' : '#0036cc' }}>{value || 'Todos'}</Text></Pressable>)}</ScrollView><Text accessibilityLiveRegion="polite" style={styles.subtitle}>{filtered.length} produto(s)</Text>{(search || category) && <Pressable accessibilityRole="button" onPress={() => { setSearch(''); setCategory(''); }} style={{ minHeight: 48, paddingVertical: 14 }}><Text style={{ color: '#0036cc' }}>Limpar filtros</Text></Pressable>}<Link href="/assistente" style={{ color: '#0036cc', paddingVertical: 14 }}>Preciso de ajuda para escolher</Link></View>} ListEmptyComponent={<Text>{products.length ? 'Nenhum produto corresponde aos filtros. Tente outra busca ou limpe os filtros.' : 'Nenhum produto disponível no catálogo.'}</Text>} renderItem={({ item }) => <View style={styles.card}><Image source={{ uri: assetUrl(item.imgUrl) }} accessibilityLabel={item.nome} style={styles.image} resizeMode="contain" /><Text style={styles.name}>{item.nome}</Text><Text style={styles.subtitle}>{item.sub}</Text><Text style={styles.price}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco)}</Text><Text>{item.estoque > 0 ? 'Disponível na loja' : 'Sem estoque no momento'}</Text><CartButton storeId={item.lojaId} productId={item.id} stock={item.estoque} /><FavoriteButton productId={item.id} /></View>} />}
  </View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, padding: 20 }, heading: { fontSize: 26, fontWeight: '700', color: '#10243e', marginBottom: 8 }, subtitle: { color: '#52647b', marginBottom: 12 }, card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#dce4f3', padding: 20, marginBottom: 16 }, image: { height: 180, width: '100%', marginBottom: 12 }, name: { fontSize: 18, fontWeight: '700', color: '#10243e', marginBottom: 6 }, price: { fontSize: 22, fontWeight: '700', color: '#0036cc', marginBottom: 8 }, error: { color: '#9c1230', marginBottom: 16 }, button: { minHeight: 48, backgroundColor: '#0036cc', borderRadius: 12, padding: 14 }, buttonText: { color: '#fff', fontWeight: '700' } });
