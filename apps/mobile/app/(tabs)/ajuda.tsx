import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { loadGuides } from '../../src/offlineGuides';
import type { Guide, Operator } from '../../src/guideSnapshot';

const channels: Record<Operator, string> = { TIM: 'https://www.tim.com.br/ajuda', VIVO: 'https://vivo.com.br/para-voce/ajuda', CLARO: 'https://www.claro.com.br/atendimento' };
const domains: Record<Operator, string> = { TIM: 'tim.com.br', VIVO: 'vivo.com.br', CLARO: 'claro.com.br' };
const topics: Record<string, string> = { planos: 'Planos e contratação', 'saldo-consumo': 'Saldo e consumo', 'chip-esim': 'Chip e eSIM', 'internet-apn': 'Internet e APN', sinal: 'Sinal', 'chamadas-sms': 'Chamadas e mensagens', portabilidade: 'Portabilidade', 'perda-roubo': 'Perda ou roubo', aplicativos: 'Aplicativos oficiais' };
export default function Help() {
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
  const matching = (guides || []).filter(row => row.operadora === operator && row.topico === topic && Date.parse(row.validoAte) > now);
  return <ScrollView contentContainerStyle={styles.screen}><Link href="/servicos" style={{ color: '#0036cc', paddingVertical: 16, fontWeight: '600' }}>Serviços, agendamento e meus atendimentos</Link>
    <Text accessibilityRole="header" style={styles.heading}>Ajuda com sua operadora</Text><Text style={styles.subtitle}>{!operator ? '1. Escolha sua operadora' : !topic ? '2. Escolha o assunto' : '3. Consulte o guia e o canal oficial'}</Text>
    {savedAt && <View><Text accessibilityRole="alert" style={styles.subtitle}>Guias salvos em {new Date(savedAt).toLocaleString('pt-BR')}. Alterações posteriores precisam de consulta online. Links oficiais exigem internet.</Text><Pressable accessibilityRole="button" onPress={() => setReload(value => value + 1)} style={styles.button}><Text style={styles.buttonText}>Atualizar guias online</Text></Pressable></View>}
    {error && <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setReload(value => value + 1)} style={styles.button}><Text style={styles.buttonText}>Tentar novamente</Text></Pressable></View>}
    {!operator ? (Object.keys(channels) as Operator[]).map(value => <Pressable key={value} accessibilityRole="button" onPress={() => { setOperator(value); setTopic(''); }} style={styles.card}><Text style={styles.name}>{value}</Text></Pressable>) : !topic ? Object.entries(topics).map(([value, label]) => <Pressable key={value} accessibilityRole="button" onPress={() => setTopic(value)} style={styles.card}><Text style={styles.name}>{label}</Text></Pressable>) : <>
      <Text accessibilityRole="header" style={styles.name}>{topics[topic]}</Text>
      {guides === null && !error && <ActivityIndicator color="#0036cc" accessibilityLabel="Consultando guias" />}
      {guides !== null && !matching.length && <View style={styles.card}><Text>A Vox ainda não tem um guia vigente para este assunto. Consulte o atendimento oficial abaixo.</Text></View>}
      {matching.map(guide => <View key={guide.id} style={styles.card}><Text accessibilityRole="header" style={styles.name}>{guide.titulo}</Text><Text style={styles.subtitle}>{guide.resumo}</Text>{guide.passos.map((text, index) => <Text key={index} style={styles.step}>{index + 1}. {text}</Text>)}<Text style={styles.subtitle}>Revisado em {new Date(guide.revisadoEm).toLocaleDateString('pt-BR')} · Válido até {new Date(guide.validoAte).toLocaleDateString('pt-BR')}</Text><Pressable accessibilityRole="link" onPress={() => open(guide.fonte)} style={styles.link}><Text style={styles.name}>Consultar fonte oficial</Text></Pressable><Pressable accessibilityRole="link" onPress={() => open(guide.canalOficial)} style={styles.link}><Text style={styles.name}>Ajuda oficial para este guia</Text></Pressable></View>)}
      <Pressable accessibilityRole="link" onPress={() => open(channels[operator])} style={styles.button}><Text style={styles.buttonText}>Atendimento oficial da {operator}</Text></Pressable><Text style={styles.subtitle}>Não compartilhe senhas, códigos de confirmação ou QR codes de eSIM com terceiros.</Text>
    </>}
    {operator && <Pressable accessibilityRole="button" onPress={() => { if (topic) setTopic(''); else setOperator(null); setError(''); }} style={styles.link}><Text style={styles.name}>Voltar</Text></Pressable>}
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { padding: 20, paddingBottom: 40 }, heading: { fontSize: 26, fontWeight: '700', color: '#10243e', marginBottom: 12 }, subtitle: { color: '#52647b', marginVertical: 12 }, name: { color: '#0036cc', fontWeight: '700', fontSize: 17 }, card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce4f3', borderRadius: 16, padding: 20, marginBottom: 16, minHeight: 52 }, button: { backgroundColor: '#0036cc', borderRadius: 12, padding: 16, minHeight: 48, marginVertical: 12 }, buttonText: { color: '#fff', fontWeight: '700' }, link: { minHeight: 48, paddingVertical: 14 }, error: { color: '#9c1230', marginBottom: 12 }, step: { marginBottom: 12, lineHeight: 23 } });
