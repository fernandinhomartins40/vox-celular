import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { assetUrl, request } from '../src/api';
type Product = { id: string; nome: string; sub: string; preco: number; estoque: number; imgUrl: string; atributosTecnicos?: { verificado?: boolean; ramGB?: number; armazenamentoGB?: number; bateriaMah?: number } };
export default function Favorites() {
  const [rows, setRows] = useState<Product[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    request<Product[]>('/favoritos', undefined, true).then(data => { if (active) { setRows(data); setSelected(previous => previous.filter(id => data.some(row => row.id === id))); setError(''); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [reload]);
  async function remove(id: string) {
    setBusy(true); setError('');
    try { await request(`/favoritos/${encodeURIComponent(id)}`, undefined, true, 'DELETE'); setRows(previous => previous?.filter(row => row.id !== id) || []); setSelected(previous => previous.filter(value => value !== id)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível remover.'); }
    finally { setBusy(false); }
  }
  const compared = (rows || []).filter(row => selected.includes(row.id));
  return <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}><Text accessibilityRole="header" style={styles.heading}>Meus favoritos</Text><Text style={styles.text}>Selecione até três aparelhos para comparar. Os preços são confirmados novamente na compra.</Text>
    {error && <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Link href="/conta" style={styles.link}>Ir para minha conta</Link></View>}
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => setReload(value => value + 1)} style={styles.control}><Text style={styles.link}>Atualizar favoritos</Text></Pressable>
    {rows === null ? !error && <ActivityIndicator color="#0036cc" /> : !rows.length ? <View><Text>Você ainda não tem favoritos disponíveis.</Text><Link href="/loja" style={styles.link}>Escolher no catálogo</Link></View> : rows.map(row => <View key={row.id} style={styles.card}><Image source={{ uri: assetUrl(row.imgUrl) }} style={{ height: 160, width: '100%' }} resizeMode="contain" accessibilityLabel={row.nome} /><Text style={styles.name}>{row.nome}</Text><Text style={styles.text}>{row.sub}</Text><Text style={styles.name}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.preco)}</Text><Text>{row.estoque > 0 ? 'Disponível' : 'Sem estoque no momento'}</Text><Link href={{ pathname: '/produto', params: { id: row.id } }} style={styles.link}>Ver detalhes</Link><Pressable accessibilityRole="checkbox" accessibilityLabel={`Comparar ${row.nome}`} accessibilityState={{ checked: selected.includes(row.id), disabled: busy || (!selected.includes(row.id) && selected.length >= 3) }} disabled={busy || (!selected.includes(row.id) && selected.length >= 3)} onPress={() => setSelected(previous => previous.includes(row.id) ? previous.filter(id => id !== row.id) : previous.length < 3 ? [...previous, row.id] : previous)} style={styles.control}><Text style={styles.link}>{selected.includes(row.id) ? 'Selecionado para comparar' : 'Comparar aparelho'}</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={() => remove(row.id)} style={styles.control}><Text style={styles.link}>Remover dos favoritos</Text></Pressable></View>)}
    {compared.length > 0 && <View accessibilityLabel="Comparação de favoritos"><Text accessibilityRole="header" style={styles.heading}>Compare suas escolhas</Text><Text style={styles.text}>Somente características conferidas pela loja. Dados ausentes não foram inferidos.</Text>{compared.map(row => <View key={row.id} style={styles.card}><Text style={styles.name}>{row.nome}</Text>{([['RAM', 'ramGB', 'GB'], ['Armazenamento', 'armazenamentoGB', 'GB'], ['Bateria', 'bateriaMah', 'mAh']] as const).map(([label, attribute, unit]) => <Text key={attribute} style={styles.text}>{label}: {row.atributosTecnicos?.verificado && row.atributosTecnicos[attribute] ? `${row.atributosTecnicos[attribute]} ${unit}` : 'Não informado'}</Text>)}</View>)}</View>}
  </ScrollView>;
}
const styles = StyleSheet.create({ heading: { color: '#10243e', fontSize: 25, fontWeight: '700', marginBottom: 16 }, text: { color: '#52647b', marginVertical: 10 }, name: { color: '#10243e', fontSize: 18, fontWeight: '700', marginVertical: 10 }, card: { backgroundColor: '#fff', padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#dce4f3', borderRadius: 16 }, link: { color: '#0036cc', paddingVertical: 12 }, control: { minHeight: 48 }, error: { color: '#9c1230' } });
