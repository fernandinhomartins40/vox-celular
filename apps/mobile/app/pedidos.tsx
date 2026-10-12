import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { request } from '../src/api';
type Order = { id: string; codigo: string; status: string; total: number | string; pagamento: string; itens: { nome: string; qty: number }[] };
const labels: Record<string, string> = { NOVO: 'Recebido', EM_PREPARO: 'Em preparo', PRONTO: 'Pronto', ENTREGUE: 'Entregue', CANCELADO: 'Cancelado' };
export default function Orders() {
  const [rows, setRows] = useState<Order[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    request<Order[]>('/pedidos/meus', undefined, true).then(data => { if (active) { setRows(data); setError(''); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [reload]);
  return <View style={{ flex: 1, padding: 20 }}><Text accessibilityRole="header" style={{ fontSize: 25, fontWeight: '700', color: '#10243e', marginBottom: 16 }}>Meus pedidos</Text>
    {error ? <View><Text accessibilityRole="alert" style={{ color: '#9c1230' }}>{error}</Text><Link href="/conta" style={{ color: '#0036cc', paddingVertical: 16 }}>Entrar na minha conta</Link><Pressable accessibilityRole="button" onPress={() => setReload(value => value + 1)} style={{ paddingVertical: 16 }}><Text style={{ color: '#0036cc' }}>Tentar novamente</Text></Pressable></View> : rows === null ? <ActivityIndicator color="#0036cc" /> : <FlatList data={rows} keyExtractor={item => item.id} refreshing={false} onRefresh={() => setReload(value => value + 1)} ListEmptyComponent={<Text>Você ainda não tem pedidos registrados.</Text>} renderItem={({ item }) => <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#dce4f3' }}><Text style={{ fontWeight: '700', fontSize: 18 }}>{item.codigo}</Text><Text style={{ color: '#0036cc', marginVertical: 10 }}>{labels[item.status] || item.status}</Text>{item.itens.map((product, index) => <Text key={index}>{product.qty} × {product.nome}</Text>)}<Text style={{ fontWeight: '700', marginTop: 12 }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.total))}</Text><Text style={{ color: '#52647b', marginTop: 6 }}>Pagamento: {item.pagamento}</Text></View>} />}
  </View>;
}
