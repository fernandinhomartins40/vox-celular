import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { request } from '../src/api';
type News = { id: string; titulo: string; resumo: string; texto?: string; fonte: string; revisadoEm: string; validoAte: string };
const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(value));
export default function NewsPage() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const [rows, setRows] = useState<News[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true; setRows(null); setError('');
    (async () => {
      if (id.length > 100) throw new Error('Novidade indisponível.');
      const store = await request<{ id: string }>('/loja');
      const route = id ? `/novidades/${encodeURIComponent(id)}?lojaId=${encodeURIComponent(store.id)}` : `/novidades?lojaId=${encodeURIComponent(store.id)}`;
      const data = await request<News[] | News>(route);
      if (active) setRows(Array.isArray(data) ? data : [data]);
    })().catch(e => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível consultar novidades.'); });
    return () => { active = false; };
  }, [id, reload]));
  async function openSource(source: string) {
    try {
      const url = new URL(source);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Fonte indisponível.');
      await Linking.openURL(url.href);
    } catch { setError('Não foi possível abrir a fonte.'); }
  }
  return <ScrollView contentContainerStyle={styles.screen}><Text accessibilityRole="header" style={styles.heading}>Novidades da Vox</Text><Text style={styles.text}>Conteúdo publicado e revisado pela loja. Confira a fonte e a validade das informações.</Text>
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Pressable accessibilityRole="button" onPress={() => setReload(value => value + 1)} style={styles.control}><Text style={styles.link}>Atualizar novidades</Text></Pressable>
    {!rows && !error && <ActivityIndicator color="#0036cc" accessibilityLabel="Consultando novidades" />}
    {rows?.length === 0 && <Text style={styles.text}>Nenhuma novidade publicada no momento.</Text>}
    {rows?.map(row => <View key={row.id} style={styles.card}><Text accessibilityRole="header" style={styles.title}>{row.titulo}</Text><Text style={styles.text}>{row.resumo}</Text>{id && <Text selectable style={styles.text}>{row.texto}</Text>}<Text style={styles.text}>Revisado em {date(row.revisadoEm)} · Válido até {date(row.validoAte)}</Text>{id ? <Pressable accessibilityRole="link" onPress={() => openSource(row.fonte)} style={styles.control}><Text style={styles.link}>Consultar fonte</Text></Pressable> : <Link href={{ pathname: '/novidades', params: { id: row.id } }} style={styles.link}>Ler novidade</Link>}</View>)}
    {id && <Link href="/novidades" style={styles.link}>Todas as novidades</Link>}
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { padding: 20, paddingBottom: 40 }, heading: { color: '#10243e', fontSize: 25, fontWeight: '700', marginBottom: 16 }, title: { color: '#10243e', fontSize: 20, fontWeight: '700', marginBottom: 12 }, text: { color: '#52647b', fontSize: 16, lineHeight: 23, marginBottom: 12 }, card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce4f3', borderRadius: 16, padding: 20, marginBottom: 16 }, control: { minHeight: 48, justifyContent: 'center' }, link: { color: '#0036cc', paddingVertical: 14, fontWeight: '600' }, error: { color: '#9c1230', marginBottom: 12 } });
