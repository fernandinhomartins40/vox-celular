// Operator help from the PWA (pages/Ajuda.jsx): operator → topic → reviewed guide and official channel.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { request } from '../../src/api';
import { loadGuides } from '../../src/offlineGuides';
import { whatsappUrl } from '../../src/storeContact';
import { font } from '../../src/ui';
import type { Guide, Operator } from '../../src/guideSnapshot';

const channels: Record<Operator, string> = { TIM: 'https://www.tim.com.br/ajuda', VIVO: 'https://vivo.com.br/para-voce/ajuda', CLARO: 'https://www.claro.com.br/atendimento', ALGAR: 'https://algar.com.br' };
const domains: Record<Operator, string> = { TIM: 'tim.com.br', VIVO: 'vivo.com.br', CLARO: 'claro.com.br', ALGAR: 'algar.com.br' };
const topics: Record<string, string> = { planos: 'Planos e contratação', 'saldo-consumo': 'Saldo e consumo', 'chip-esim': 'Chip e eSIM', 'internet-apn': 'Internet e APN', sinal: 'Sinal', 'chamadas-sms': 'Chamadas e mensagens', portabilidade: 'Portabilidade', 'perda-roubo': 'Perda ou roubo', aplicativos: 'Aplicativos oficiais' };

export default function Help() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [guides, setGuides] = useState<Guide[] | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [topic, setTopic] = useState('');
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [reload, setReload] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let active = true;
    loadGuides().then(result => { if (active) { setGuides(result.guides); setSavedAt(result.savedAt); setNow(Date.now()); setError(''); } }).catch(e => { if (active) setError(e.message); });
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => { active = false; clearInterval(timer); };
  }, [reload]);
  async function open(url: string) {
    try {
      if (!operator) return;
      const parsed = new URL(url), domain = domains[operator];
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password || (parsed.port && parsed.port !== '443') || (parsed.hostname !== domain && !parsed.hostname.endsWith(`.${domain}`))) throw new Error('Este link não pertence ao canal oficial da operadora.');
      await Linking.openURL(url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível abrir o atendimento oficial.'); }
  }
  async function talk() {
    try { const store = await request<{ telefone?: string }>('/loja'); await Linking.openURL(whatsappUrl(store.telefone || '', 'Olá! Preciso de ajuda.')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível abrir o WhatsApp.'); }
  }
  const matching = (guides || []).filter(row => row.operadora === operator && row.topico === topic && Date.parse(row.validoAte) > now);
  const step = !operator ? 1 : !topic ? 2 : 3;
  return <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
    <View style={[st.top, { paddingTop: insets.top + 8 }]}>
      <Pressable accessibilityRole="link" onPress={() => router.navigate('/')} style={st.control}><Text style={[st.topText, font()]}>Voltar à loja</Text></Pressable>
      <Pressable accessibilityRole="link" onPress={() => router.push('/servicos')} style={st.control}><Text style={[st.topText, { color: '#1d4ed8' }, font()]}>Solicitar serviço da Vox</Text></Pressable>
    </View>
    <ScrollView contentContainerStyle={st.screen}>
      <Text accessibilityRole="header" style={[st.heading, font(700)]}>Como podemos ajudar?</Text>
      <Text style={[st.subtitle, font()]}>Orientações revisadas e canais oficiais das operadoras.</Text>
      <View style={st.steps}>{['Sua operadora', 'Seu assunto', 'Guia e ajuda oficial'].map((label, index) => <Text key={label} accessibilityState={{ selected: step === index + 1 }} style={[{ fontSize: 14, color: step === index + 1 ? '#1d4ed8' : '#64748b' }, font(step === index + 1 ? 700 : 400)]}>{index + 1}. {label}</Text>)}</View>
      {savedAt ? <View style={st.notice}><Text accessibilityRole="alert" style={[{ color: '#92400e', fontSize: 14, lineHeight: 20 }, font()]}>Guias salvos em {new Date(savedAt).toLocaleString('pt-BR')}. Alterações posteriores precisam de consulta online. Links oficiais exigem internet.</Text><Pressable accessibilityRole="button" onPress={() => setReload(value => value + 1)} style={st.control}><Text style={[st.link, font(600)]}>Atualizar guias online</Text></Pressable></View> : null}
      {error ? <View style={st.errorBox}><Text accessibilityRole="alert" style={[{ color: '#991b1b', fontSize: 14 }, font()]}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setReload(value => value + 1)} style={st.control}><Text style={[{ color: '#991b1b', textDecorationLine: 'underline' }, font()]}>Tentar novamente</Text></Pressable></View> : null}
      <Text accessibilityRole="header" style={[st.h2, font(700)]}>{step === 1 ? 'Qual é sua operadora?' : step === 2 ? `Do que precisa na ${operator}?` : topics[topic]}</Text>
      {step === 1 ? (Object.keys(channels) as Operator[]).map(value => <Pressable key={value} accessibilityRole="button" onPress={() => { setOperator(value); setTopic(''); }} style={st.card}><Text style={[st.name, font(600)]}>{value}</Text></Pressable>)
        : step === 2 ? Object.entries(topics).map(([value, label]) => <Pressable key={value} accessibilityRole="button" onPress={() => setTopic(value)} style={st.card}><Text style={[st.name, font(600)]}>{label}</Text></Pressable>)
        : <>
          {guides === null && !error ? <ActivityIndicator color="#1d4ed8" accessibilityLabel="Consultando guias revisados" /> : null}
          {guides !== null && !matching.length ? <View style={st.article}><Text style={[{ color: '#0f172a', fontSize: 15 }, font()]}>A Vox ainda não tem um guia vigente para este assunto.</Text><Text style={[{ color: '#64748b', fontSize: 13, marginTop: 8 }, font()]}>Consulte o canal oficial abaixo para obter instruções atuais.</Text></View> : null}
          {matching.map(guide => <View key={guide.id} style={st.article}>
            <Text accessibilityRole="header" style={[{ fontSize: 18, color: '#0f172a' }, font(700)]}>{guide.titulo}</Text>
            <Text style={[st.subtitle, { marginBottom: 16 }, font()]}>{guide.resumo}</Text>
            {guide.passos.map((text, index) => <Text key={index} style={[st.step, font()]}>{index + 1}. {text}</Text>)}
            <Text style={[{ fontSize: 12, color: '#64748b', marginBottom: 8 }, font()]}>Revisado em {new Date(guide.revisadoEm).toLocaleDateString('pt-BR')} · Válido até {new Date(guide.validoAte).toLocaleDateString('pt-BR')}</Text>
            <Pressable accessibilityRole="link" onPress={() => open(guide.fonte)} style={st.control}><Text style={[st.link, { textDecorationLine: 'underline' }, font()]}>Consultar fonte oficial</Text></Pressable>
            <Pressable accessibilityRole="link" onPress={() => open(guide.canalOficial)} style={st.control}><Text style={[st.link, { textDecorationLine: 'underline' }, font()]}>Ajuda oficial para este guia</Text></Pressable>
          </View>)}
          <Pressable accessibilityRole="link" onPress={() => open(channels[operator!])} style={st.button}><Text style={[{ color: '#fff', fontSize: 15 }, font(600)]}>Abrir atendimento oficial da {operator}</Text></Pressable>
          <Text style={[{ fontSize: 13, lineHeight: 19, color: '#64748b', marginTop: 16 }, font()]}>Não compartilhe senhas, códigos de confirmação ou QR codes de eSIM com terceiros. A Vox não recebe essas informações nesta página.</Text>
        </>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 24 }}>
        {operator ? <Pressable accessibilityRole="button" onPress={() => { if (topic) setTopic(''); else setOperator(null); setError(''); }} style={[st.control, { paddingHorizontal: 16 }]}><Text style={[st.link, font()]}>Voltar</Text></Pressable> : null}
        <Pressable accessibilityRole="link" onPress={talk} style={[st.control, { paddingHorizontal: 16 }]}><Text style={[st.link, font()]}>Falar com a Vox</Text></Pressable>
      </View>
    </ScrollView>
  </View>;
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingBottom: 6, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  topText: { fontSize: 15, color: '#0f172a' },
  screen: { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 40 },
  heading: { fontSize: 30, lineHeight: 36, color: '#0f172a' },
  subtitle: { color: '#475569', fontSize: 15, lineHeight: 22, marginTop: 8 },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginVertical: 24 },
  h2: { fontSize: 20, color: '#0f172a', marginBottom: 16 },
  name: { color: '#1d4ed8', fontSize: 16 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 20, marginBottom: 16, minHeight: 56, justifyContent: 'center' },
  article: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 20, marginBottom: 16 },
  button: { alignSelf: 'flex-start', backgroundColor: '#1d4ed8', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, minHeight: 48, justifyContent: 'center', marginTop: 20 },
  control: { minHeight: 44, justifyContent: 'center' },
  link: { color: '#1d4ed8', fontSize: 15 },
  notice: { backgroundColor: '#fffbeb', borderRadius: 12, padding: 16, marginBottom: 16 },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 16, marginBottom: 16 },
  step: { marginBottom: 12, lineHeight: 23, fontSize: 15, color: '#0f172a' },
});
