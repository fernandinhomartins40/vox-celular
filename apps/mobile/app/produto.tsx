import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, Link } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { request, assetUrl } from '../src/api';
import CartButton from '../src/CartButton';
import FavoriteButton from '../src/FavoriteButton';

type Product = { id: string; lojaId: string; nome: string; sub: string; categoria: string; preco: number; estoque: number; imgUrl: string; descricao: string; specs: string[]; atributosTecnicos?: { verificado?: boolean; ramGB?: number; armazenamentoGB?: number; bateriaMah?: number } };
export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const productId = typeof id === 'string' ? id : '';
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setProduct(null); setError('');
    if (!productId || productId.length > 200) { setError('Escolha um produto no catálogo.'); return; }
    request<{ id: string }>('/loja').then(store => request<Product>(`/produtos/${encodeURIComponent(productId)}?lojaId=${encodeURIComponent(store.id)}`))
      .then(row => { if (active) setProduct(row); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [productId, reload]));
  return <ScrollView contentContainerStyle={styles.screen}>
    {error ? <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setReload(value => value + 1)} style={styles.control}><Text style={styles.link}>Tentar novamente</Text></Pressable><Link href="/loja" style={styles.link}>Voltar ao catálogo</Link></View> : !product ? <ActivityIndicator color="#0036cc" accessibilityLabel="Carregando produto" /> : <>
      <View style={styles.card}>{product.imgUrl ? <Image source={{ uri: assetUrl(product.imgUrl) }} resizeMode="contain" style={styles.image} accessibilityLabel={product.nome} /> : <Text style={styles.text}>Imagem não disponível</Text>}
        <Text style={styles.text}>{product.categoria}</Text><Text accessibilityRole="header" style={styles.title}>{product.nome}</Text><Text style={styles.text}>{product.sub}</Text>
        <Text style={styles.price}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.preco)}</Text><Text style={styles.text}>{product.estoque > 0 ? 'Disponível na loja' : 'Sem estoque no momento'}</Text>
        <CartButton storeId={product.lojaId} productId={product.id} stock={product.estoque} /><FavoriteButton productId={product.id} />
      </View>
      <View style={styles.card}><Text accessibilityRole="header" style={styles.heading}>Sobre o produto</Text><Text style={styles.text}>{product.descricao || 'Descrição não informada.'}</Text>{product.specs?.slice(0, 12).map((spec, index) => <Text key={index} style={styles.text}>• {spec}</Text>)}</View>
      <View style={styles.card}><Text accessibilityRole="header" style={styles.heading}>Características conferidas</Text>{([['Memória RAM', 'ramGB', 'GB'], ['Armazenamento', 'armazenamentoGB', 'GB'], ['Bateria', 'bateriaMah', 'mAh']] as const).map(([label, field, unit]) => <Text key={field} style={styles.text}>{label}: {product.atributosTecnicos?.verificado && product.atributosTecnicos[field] ? `${product.atributosTecnicos[field]} ${unit}` : 'Não informado'}</Text>)}<Link href="/assistente" style={styles.link}>Preciso de ajuda para escolher</Link></View>
    </>}
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { padding: 20, paddingBottom: 32 }, card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce4f3', borderRadius: 16, padding: 20, marginBottom: 16 }, image: { width: '100%', height: 240 }, title: { color: '#10243e', fontSize: 26, fontWeight: '700' }, heading: { color: '#10243e', fontSize: 20, fontWeight: '700' }, price: { color: '#0036cc', fontSize: 24, fontWeight: '700', marginVertical: 12 }, text: { color: '#52647b', fontSize: 16, marginVertical: 8 }, link: { color: '#0036cc', paddingVertical: 14 }, control: { minHeight: 48 }, error: { color: '#9c1230', fontSize: 16 } });
