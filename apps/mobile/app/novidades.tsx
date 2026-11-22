// Store news from the PWA (pages/Novidades.jsx).
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { request } from '../src/api';
import { font } from '../src/ui';

type News = { id: string; titulo: string; resumo: string; texto?: string; fonte: string; revisadoEm: string; validoAte: string };
const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(value));

export default function NewsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  return <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
    <View style={[st.header, { paddingTop: insets.top + 12 }]}>
      <Pressable accessibilityRole="link" accessibilityLabel="Vox Celular, início" onPress={() => router.navigate('/')}><Image source={require('../assets/brand/vox-logo.png')} style={{ width: 92, height: 70 }} resizeMode="contain" /></Pressable>
      <Pressable accessibilityRole="link" onPress={() => router.canGoBack() ? router.back() : router.navigate('/')} style={st.control}><Text style={[st.link, font(600)]}>Voltar à loja</Text></Pressable>
    </View>
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 32 }}>
      <Text accessibilityRole="header" style={[{ fontSize: 30, lineHeight: 36, color: '#0f172a' }, font(700)]}>Novidades da Vox</Text>
      <Text style={[st.text, { marginTop: 12 }, font()]}>Conteúdo publicado e revisado pela loja. Confira a fonte e a validade das informações.</Text>
      <Pressable accessibilityRole="button" onPress={() => setReload(value => value + 1)} style={st.refresh}><Text style={[st.link, font(600)]}>Atualizar novidades</Text></Pressable>
      {error ? <Text accessibilityRole="alert" style={[{ color: '#b91c1c', fontSize: 15, lineHeight: 22 }, font()]}>{error}</Text> : null}
      {!rows && !error ? <ActivityIndicator color="#1d4ed8" accessibilityLabel="Consultando novidades" /> : null}
      {rows?.length === 0 ? <Text style={[st.text, font()]}>Nenhuma novidade publicada no momento.</Text> : null}
      {rows?.map(row => <View key={row.id} style={st.card}>
        <Text accessibilityRole="header" style={[{ fontSize: 20, color: '#0f172a' }, font(700)]}>{row.titulo}</Text>
        <Text style={[st.text, { marginTop: 12 }, font()]}>{row.resumo}</Text>
        {id ? <Text selectable style={[{ marginTop: 20, fontSize: 15, lineHeight: 24, color: '#0f172a' }, font()]}>{row.texto}</Text> : null}
        <Text style={[{ marginTop: 16, fontSize: 13, color: '#64748b' }, font()]}>Revisado em {date(row.revisadoEm)} · Válido até {date(row.validoAte)}</Text>
        {id ? <Pressable accessibilityRole="link" onPress={() => openSource(row.fonte)} style={st.control}><Text style={[st.link, font(600)]}>Consultar fonte</Text></Pressable>
          : <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/novidades', params: { id: row.id } })} style={st.control}><Text style={[st.link, font(600)]}>Ler novidade</Text></Pressable>}
      </View>)}
      {id ? <Pressable accessibilityRole="link" onPress={() => router.replace('/novidades')} style={st.control}><Text style={[st.link, font(600)]}>Todas as novidades</Text></Pressable> : null}
    </ScrollView>
  </View>;
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  text: { color: '#475569', fontSize: 15, lineHeight: 22 },
  link: { color: '#1d4ed8', fontSize: 15 },
  control: { minHeight: 44, justifyContent: 'center', marginTop: 12 },
  refresh: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, marginVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  card: { marginBottom: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', padding: 24 },
});
