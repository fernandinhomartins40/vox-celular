// Vox Discovery from the PWA (pages/Assistente.jsx): one choice per screen, then the match card.
import { useState } from 'react';
import { Animated, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { assetUrl, request } from '../src/api';
import { addToCart } from '../src/cart';
import CompatibleAccessories from '../src/CompatibleAccessories';
import { whatsappUrl } from '../src/storeContact';
import { DiscoveryShell, D, YellowButton, queueDiscoveries, useFloat, vibeImage } from '../src/discovery';
import { C, brandIcon, font, money } from '../src/ui';

type Attributes = { tipo?: string; verificado?: boolean; fonte?: string; ramGB?: number; armazenamentoGB?: number; bateriaMah?: number };
type Product = { id: string; nome: string; lojaId: string; categoria: string; preco: number; estoque: number; imgUrl: string; atributosTecnicos?: Attributes };
type Result = { produto: Product; motivos: string[]; fonte: string | null; observacao: string };
type Response = { aviso: string; mensagem: string | null; catalogoLimitado: boolean; resultados: Result[] };
type Scene = 'type' | 'budget' | 'usage' | 'priority';

const usages: [string, string, string][] = [['dia-a-dia', 'Conectar', 'Meu dia a dia'], ['fotos', 'Criar', 'Fotos e vídeos'], ['jogos', 'Jogar', 'Minha próxima partida'], ['trabalho', 'Produzir', 'Trabalho e arquivos'], ['estudos', 'Aprender', 'Estudos'], ['redes-sociais', 'Compartilhar', 'Redes sociais']];
const priorities: [string, string][] = [['equilibrado', 'Equilíbrio'], ['economia', 'Economia'], ['bateria', 'Bateria'], ['armazenamento', 'Espaço']];
const questions: Record<Scene, string> = { type: 'Qual vai ser seu upgrade?', budget: 'Até quanto vamos?', usage: 'O que te move?', priority: 'O que faz a diferença?' };

function Device({ tablet }: { tablet: boolean }) {
  const float = useFloat();
  return <View style={st.stage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg style={st.deviceShadow} width={220} height={40}><Defs><RadialGradient id="shadow" cx="50%" cy="50%" rx="50%" ry="50%"><Stop offset="0" stopColor="#06134b" stopOpacity="0.55" /><Stop offset="1" stopColor="#06134b" stopOpacity="0" /></RadialGradient></Defs><Ellipse cx="110" cy="20" rx="110" ry="20" fill="url(#shadow)" /></Svg>
    <Animated.View style={{ transform: [{ translateY: float }, { perspective: 800 }, { rotateY: tablet ? '-14deg' : '-20deg' }, { rotateZ: tablet ? '8deg' : '-10deg' }] }}>
      <View style={[st.deviceEdge, tablet ? { width: 190, height: 240, borderRadius: 22 } : { width: 140, height: 240, borderRadius: 25 }]}>
        <LinearGradient colors={['#f9fcff', '#698cd9', '#233778', '#cce5ff']} locations={[0, 0.35, 0.65, 1]} start={{ x: 0, y: 0.3 }} end={{ x: 1, y: 0.7 }} style={[StyleSheet.absoluteFill, { borderRadius: tablet ? 22 : 25 }]} />
        <View style={[st.screen, { borderRadius: tablet ? 17 : 20 }]}>
          <LinearGradient colors={['#82e5ff', '#1864ff', '#5031df']} locations={[0, 0.45, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(255,255,255,0.31)', 'rgba(255,255,255,0)']} locations={[0, 0.45]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={st.notch} />
          <Text style={st.screenSpark}>✦</Text>
        </View>
      </View>
    </Animated.View>
    <Text style={st.floatingSpark}>✦</Text>
  </View>;
}
function Coin() {
  const float = useFloat();
  return <View style={st.stage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Animated.View style={{ transform: [{ translateY: float }, { perspective: 800 }, { rotateY: '-20deg' }, { rotateZ: '-12deg' }] }}>
      <View style={st.coinEdge}><LinearGradient colors={['#fff5bc', '#ffcf42', '#df981d']} locations={[0, 0.7, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.coin}><Text style={[st.coinText, font(700)]}>R$</Text></LinearGradient></View>
    </Animated.View>
    <Text style={[st.floatingSpark, { fontSize: 35, right: '19%', top: '13%' }]}>✦</Text>
  </View>;
}
function Vibe({ value }: { value: string }) {
  const float = useFloat();
  return <View style={st.stage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <View style={st.orbit} />
    <Animated.Image source={vibeImage(value)} style={[st.vibe, { transform: [{ translateY: float }] }]} resizeMode="contain" />
    <Text style={[st.floatingSpark, { fontSize: 27, right: '15%', top: '15%', color: '#d4f6ff' }]}>✦</Text>
  </View>;
}

export default function Assistant() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [scene, setScene] = useState<Scene>('type');
  const [needs, setNeeds] = useState({ tipo: 'celular', orcamento: '', uso: 'nao-sei', prioridade: 'equilibrado', ramMinima: 0, armazenamentoMinimo: 0 });
  const [result, setResult] = useState<Response | null>(null);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [externalAi, setExternalAi] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState<'options' | 'privacy' | 'product' | null>(null);
  const amount = Number(needs.orcamento.replace(',', '.'));
  const update = (field: keyof typeof needs, value: string | number) => { setNeeds(previous => ({ ...previous, [field]: value })); setError(''); };
  async function search() {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const store = await request<{ id: string }>('/loja');
      const payload = { lojaId: store.id, tipo: needs.tipo, orcamento: amount, uso: needs.uso, ...(needs.prioridade !== 'equilibrado' ? { prioridade: needs.prioridade } : {}), ...(needs.ramMinima ? { ramMinima: needs.ramMinima } : {}), ...(needs.armazenamentoMinimo ? { armazenamentoMinimo: needs.armazenamentoMinimo } : {}) };
      setResult(await request<Response>(externalAi ? '/assistente/recomendar-ia' : '/assistente/recomendar', externalAi ? { necessidades: payload, autorizaProcessamentoExterno: true } : payload));
      setSelected(0); setStep(3);
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível consultar as opções.'); }
    finally { setBusy(false); }
  }
  function next() {
    if (scene === 'type') setScene('budget');
    else if (scene === 'budget') {
      if (!Number.isFinite(amount) || amount < 0.01 || amount > 100000) { setError('Informe um valor de R$ 0,01 a R$ 100.000.'); return; }
      setStep(2); setScene('usage');
    } else if (scene === 'usage') setScene('priority');
    else search();
  }
  function back() { if (scene === 'budget') setScene('type'); else if (scene === 'usage') { setScene('budget'); setStep(1); } else setScene('usage'); }
  async function add(product: Product) {
    setBusy(true); setError(''); setNotice('');
    try {
      const rows = await request<Product[]>(`/produtos?lojaId=${encodeURIComponent(product.lojaId)}`);
      const current = rows.find(row => row.id === product.id);
      if (!current || current.estoque < 1) throw new Error('Este aparelho ficou indisponível. Atualize as opções.');
      if (Math.round(current.preco * 100) > Math.floor(amount * 100 + 0.000001)) throw new Error('O preço mudou e ultrapassa seu orçamento. Atualize as opções.');
      const attributes = current.atributosTecnicos || {};
      const type = attributes.tipo || ({ Celulares: 'celular', Tablets: 'tablet' } as Record<string, string>)[current.categoria];
      if (type !== needs.tipo) throw new Error('O cadastro deste aparelho mudou. Atualize as opções.');
      for (const [requirement, attribute] of [['ramMinima', 'ramGB'], ['armazenamentoMinimo', 'armazenamentoGB']] as const) {
        const minimum = needs[requirement];
        if (minimum && (!attributes.verificado || !attributes.fonte || !attributes[attribute] || attributes[attribute]! < minimum)) throw new Error('As informações técnicas mudaram e não confirmam seus critérios. Atualize as opções.');
      }
      await addToCart(current.lojaId, current.id, current.estoque);
      setResult(previous => previous && ({ ...previous, resultados: previous.resultados.map(row => row.produto.id === current.id ? { ...row, produto: current } : row) }));
      router.push('/carrinho');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível adicionar.'); }
    finally { setBusy(false); }
  }
  async function finish() {
    if (!result) return;
    try { await queueDiscoveries(result.resultados); router.push('/descobertas'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível guardar.'); }
  }
  async function help() {
    try { const store = await request<{ telefone?: string }>('/loja'); await Linking.openURL(whatsappUrl(store.telefone || '', 'Olá! Preciso de ajuda para escolher meu próximo aparelho.')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível abrir o WhatsApp.'); }
  }
  const choice = (label: string, on: boolean, onPress: () => void, extra?: ViewStyle, image?: number, size = 14) => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: on }} disabled={busy} onPress={onPress} style={[st.choice, on && st.choiceOn, extra]}>
    {image ? <Image source={image} style={{ width: 27, height: 27 }} resizeMode="contain" /> : null}<Text style={[{ color: on ? D.yellowInk : '#fff', fontSize: size }, font(600)]}>{label}</Text>
  </Pressable>;
  const row = result?.resultados[selected];
  return <DiscoveryShell>
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 10 }} keyboardShouldPersistTaps="handled">
      <View style={st.progress} accessibilityLabel="Etapas da escolha">{['Seu limite', 'Sua vibe', 'Seu match'].map((label, index) => { const current = step === index + 1, done = step > index + 1; return <View key={label} style={st.progressItem} accessibilityState={{ selected: current }}>
        <View style={[st.dot, current && { backgroundColor: D.yellow, borderWidth: 0 }, done && { backgroundColor: '#36e4c5', borderWidth: 0 }]}><Text style={[{ fontSize: 10, color: current ? '#07318f' : done ? '#073c53' : '#a9c4ff' }, font(current ? 700 : 400)]}>{done ? '✓' : `0${index + 1}`}</Text></View>
        <Text style={[{ fontSize: 11, color: current ? D.yellow : '#a9c4ff' }, font(current ? 700 : 400)]}>{label}</Text>
      </View>; })}</View>
      {error && !dialog ? <Text accessibilityRole="alert" style={st.alert}>{error}</Text> : null}
      {notice ? <Text accessibilityLiveRegion="polite" style={[st.alert, { backgroundColor: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }]}>{notice}</Text> : null}
      <Text accessibilityRole="header" style={[st.question, font(700)]}>{step === 3 ? 'Seu próximo match.' : questions[scene]}</Text>
      {step < 3 ? <View style={{ alignItems: 'center', gap: 16, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
        {scene === 'type' && <><Device tablet={needs.tipo === 'tablet'} /><View style={st.grid2}>{[['celular', 'Celular'], ['tablet', 'Tablet']].map(([value, label]) => choice(label, needs.tipo === value, () => update('tipo', value), { minHeight: 58 }, undefined, 18))}</View></>}
        {scene === 'budget' && <><Coin /><View style={{ width: '100%', alignItems: 'center' }}>
          <Text style={[{ fontSize: 12, color: D.soft }, font(600)]}>Valor máximo em reais</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 18 }}><Text style={[{ fontSize: 26, color: '#b6d1ff' }, font()]}>R$</Text><TextInput accessibilityLabel="Valor máximo em reais" keyboardType="decimal-pad" value={needs.orcamento} onChangeText={value => update('orcamento', value)} placeholder="Seu limite" placeholderTextColor="#a5bff1" maxLength={12} style={[st.budget, font(700), !needs.orcamento && { fontSize: 28, letterSpacing: -1 }]} /></View>
          <View style={{ flexDirection: 'row', gap: 6, width: '100%', maxWidth: 420 }}>{[1000, 2000, 3000, 5000].map(value => { const on = amount === value; return <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => update('orcamento', String(value))} style={[st.preset, on && { backgroundColor: D.yellow, borderColor: D.yellow }]}><Text style={[{ fontSize: 11, color: on ? '#14326b' : '#e0eaff' }, font()]}>{money(value).replace(',00', '')}</Text></Pressable>; })}</View>
        </View><Text style={[st.caption, font()]}>Seu limite é o nosso ponto de partida.</Text></>}
        {scene === 'usage' && <><Vibe key={needs.uso} value={needs.uso} /><Text style={[st.caption, font()]}>{usages.find(item => item[0] === needs.uso)?.[2] || 'Descubra no seu ritmo'}</Text>
          <View style={st.grid3}>{usages.map(([value, label]) => choice(label, needs.uso === value, () => update('uso', value), { flexBasis: '30%', paddingHorizontal: 5 }, vibeImage(value), 12))}</View>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: needs.uso === 'nao-sei' }} onPress={() => update('uso', 'nao-sei')} style={{ minHeight: 32, justifyContent: 'center' }}><Text style={[{ fontSize: 12, color: needs.uso === 'nao-sei' ? D.yellow : '#c6d9ff', textDecorationLine: 'underline' }, font(needs.uso === 'nao-sei' ? 700 : 400)]}>Ainda estou descobrindo</Text></Pressable></>}
        {scene === 'priority' && <><Vibe key={needs.prioridade} value={needs.prioridade} />
          <View style={st.grid2}>{priorities.map(([value, label]) => choice(label, needs.prioridade === value, () => update('prioridade', value), undefined, vibeImage(value)))}</View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Pressable accessibilityRole="button" onPress={() => setDialog('options')} style={{ minHeight: 36, justifyContent: 'center' }}><Text style={[{ fontSize: 11, color: '#c3d7ff', textDecorationLine: 'underline' }, font()]}>Ajustes opcionais</Text></Pressable>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: externalAi }} disabled={busy} onPress={() => setExternalAi(v => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36 }}><View style={[st.check, externalAi && { backgroundColor: D.yellow, borderColor: D.yellow }]}>{externalAi ? <Text style={{ color: D.yellowInk, fontSize: 12 }}>✓</Text> : null}</View><Text style={[{ fontSize: 11, color: '#c4d9ff' }, font()]}>Autorizar IA externa</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Como funciona a IA?" onPress={() => setDialog('privacy')} style={{ minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 19, color: '#c4d9ff' }}>ⓘ</Text></Pressable>
          </View></>}
        <View style={st.actions}>
          {scene !== 'type' && <Pressable accessibilityRole="button" accessibilityLabel="Voltar" disabled={busy} onPress={back} style={st.back}><Text style={{ color: '#fff', fontSize: 22 }}>←</Text></Pressable>}
          <YellowButton label={busy ? 'Buscando seu match…' : scene === 'priority' ? 'Mostrar opções' : 'Continuar'} onPress={next} disabled={busy} style={{ flex: 1 }} />
        </View>
      </View> : <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center' }}>
        <Text style={[st.mode, font()]}>{result?.aviso}</Text>
        {!result?.resultados.length ? <View style={st.empty}><Text style={[{ fontSize: 14, lineHeight: 22, color: '#243a5e', textAlign: 'center' }, font()]}>{result?.mensagem}</Text></View> : null}
        {row ? <View key={row.produto.id} style={st.card}>
          <Image source={row.produto.imgUrl ? { uri: assetUrl(row.produto.imgUrl) } : brandIcon} style={{ width: '100%', height: 150 }} resizeMode="contain" accessibilityLabel={row.produto.nome} />
          <Text numberOfLines={2} style={[{ fontSize: 18, lineHeight: 22, color: '#18315a', textAlign: 'center' }, font(700)]}>{row.produto.nome}</Text>
          <Text style={[{ fontSize: 26, color: C.blue }, font(700)]}>{money(row.produto.preco)}</Text>
          <Text numberOfLines={2} style={[{ fontSize: 11, lineHeight: 15, color: '#62728b', textAlign: 'center' }, font()]}>{row.motivos[0]}</Text>
          <Pressable accessibilityRole="button" onPress={() => setDialog('product')} style={{ minHeight: 36, justifyContent: 'center' }}><Text style={[{ fontSize: 12, color: C.blue, textDecorationLine: 'underline' }, font()]}>Por que combina comigo?</Text></Pressable>
          <YellowButton label="Adicionar ao carrinho" trailing="" disabled={busy} onPress={() => add(row.produto)} style={{ alignSelf: 'stretch' }} />
        </View> : null}
        {result?.resultados.length ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
          {result.resultados.length > 1 && <View style={{ flexDirection: 'row', gap: 6 }}>{result.resultados.map((item, index) => <Pressable key={item.produto.id} accessibilityRole="button" accessibilityLabel={`Ver opção ${index + 1}: ${item.produto.nome}`} accessibilityState={{ selected: selected === index }} onPress={() => setSelected(index)} style={[st.page, selected === index && { backgroundColor: D.yellow, borderColor: D.yellow }]}><Text style={[{ fontSize: 12, color: selected === index ? '#153671' : '#fff' }, font(600)]}>{index + 1}</Text></Pressable>)}</View>}
          <Pressable accessibilityRole="button" accessibilityLabel="Finalizar e guardar descobertas" disabled={busy} onPress={finish} style={st.finish}><Text style={[{ fontSize: 11, color: '#eef8ff' }, font(700)]}>Guardar descobertas</Text><Text style={{ color: '#ffdf72' }}>↗</Text></Pressable>
        </View> : null}
        <View style={[st.actions, { flexWrap: 'wrap', marginTop: 8 }]}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setStep(1); setScene('budget'); setError(''); setExternalAi(false); }} style={st.adjust}><Text style={[{ fontSize: 12, color: '#d7e5ff' }, font()]}>Ajustar escolhas</Text></Pressable>
          <Pressable accessibilityRole="link" onPress={help} style={{ minHeight: 36, justifyContent: 'center' }}><Text style={[{ fontSize: 11, color: '#b9d1ff' }, font()]}>Pedir ajuda à Vox</Text></Pressable>
          <Pressable accessibilityRole="link" onPress={() => router.navigate('/loja')} style={{ minHeight: 36, justifyContent: 'center' }}><Text style={[{ fontSize: 11, color: '#b9d1ff' }, font()]}>Ver catálogo completo</Text></Pressable>
        </View>
      </View>}
    </ScrollView>
    <Modal visible={dialog !== null} transparent animationType="fade" onRequestClose={() => setDialog(null)}>
      <View style={st.backdrop}><View style={[st.dialog, { marginTop: insets.top + 40, marginBottom: insets.bottom + 40 }]}><ScrollView>
        <Pressable accessibilityRole="button" onPress={() => setDialog(null)} style={st.dialogClose}><Text style={[{ color: C.blue, fontSize: 12 }, font()]}>Fechar detalhes</Text></Pressable>
        {error ? <Text accessibilityRole="alert" style={[st.dialogText, { color: '#9f1239' }]}>{error}</Text> : null}
        {dialog === 'options' && <><Text accessibilityRole="header" style={[st.dialogTitle, font(700)]}>Ajustes opcionais</Text>
          {([['ramMinima', 'RAM mínima', [4, 6, 8, 12, 16]], ['armazenamentoMinimo', 'Armazenamento mínimo', [64, 128, 256, 512]]] as const).map(([field, label, values]) => <View key={field} style={{ marginBottom: 16 }}><Text style={[{ fontSize: 14, color: '#233956', marginBottom: 8 }, font(600)]}>{label}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[0, ...values].map(value => { const on = needs[field] === value; return <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => update(field, value)} style={[st.option, on && { backgroundColor: C.blue, borderColor: C.blue }]}><Text style={[{ fontSize: 13, color: on ? '#fff' : '#233956' }, font()]}>{value ? `${value} GB` : 'Qualquer'}</Text></Pressable>; })}</View></View>)}
          <Text style={[st.dialogText, font()]}>Só usamos especificações conferidas pela loja para atender a esses mínimos.</Text></>}
        {dialog === 'privacy' && <><Text accessibilityRole="header" style={[st.dialogTitle, font(700)]}>Um toque de IA</Text><Text style={[st.dialogText, font()]}>Ao autorizar, suas preferências e dados dos aparelhos são enviados ao DeepSeek ou Qwen configurado pela Vox. Sem nome, telefone ou pagamento.</Text><Text style={[st.dialogText, font()]}>Sem autorização ou com IA indisponível, usamos regras do catálogo e identificamos isso no resultado.</Text></>}
        {dialog === 'product' && row && <><Text accessibilityRole="header" style={[st.dialogTitle, font(700)]}>{row.produto.nome}</Text>
          {row.motivos.map(reason => <Text key={reason} style={[st.dialogText, font()]}>• {reason}</Text>)}
          <Text style={[st.dialogText, font()]}>{row.observacao}</Text>
          {row.fonte ? <Pressable accessibilityRole="link" onPress={() => Linking.openURL(row.fonte!)}><Text style={[st.dialogText, { color: C.blue, textDecorationLine: 'underline' }, font()]}>Fonte conferida pela loja</Text></Pressable> : null}
          <CompatibleAccessories product={row.produto} />
          <Text style={[{ fontSize: 17, color: '#233956', marginTop: 20, marginBottom: 10 }, font(700)]}>Compare as informações conferidas</Text>
          {([['RAM', 'ramGB', 'GB'], ['Armazenamento', 'armazenamentoGB', 'GB'], ['Bateria', 'bateriaMah', 'mAh']] as const).map(([label, field, unit]) => <View key={field} style={st.compare}><Text style={[{ fontSize: 13, color: '#233956', width: 110 }, font(700)]}>{label}</Text><View style={{ flex: 1 }}>{result!.resultados.map(({ produto }) => <Text key={produto.id} style={[{ fontSize: 13, color: '#233956' }, font()]}>{produto.nome}: {produto.atributosTecnicos?.verificado && produto.atributosTecnicos[field] ? `${produto.atributosTecnicos[field]} ${unit}` : 'Não informado'}</Text>)}</View></View>)}
          <Text style={[st.dialogText, font()]}>Dados técnicos não conferidos aparecem como não informados.</Text>
          {result?.catalogoLimitado ? <Text style={[st.dialogText, font()]}>Analisamos até 500 produtos, começando pelos menores preços.</Text> : null}</>}
      </ScrollView></View></View>
    </Modal>
  </DiscoveryShell>;
}

const st = StyleSheet.create({
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginBottom: 16 },
  progressItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.21)', alignItems: 'center', justifyContent: 'center' },
  alert: { borderRadius: 12, borderWidth: 1, borderColor: '#f6b0b0', backgroundColor: '#fef2f2', color: '#991b1b', padding: 14, fontSize: 12, marginBottom: 12, overflow: 'hidden' },
  question: { textAlign: 'center', fontSize: 27, lineHeight: 33, letterSpacing: -1, color: '#fff', marginBottom: 20 },
  stage: { width: '100%', height: 270, alignItems: 'center', justifyContent: 'center' },
  deviceShadow: { position: 'absolute', bottom: 0 },
  deviceEdge: { padding: 6, shadowColor: '#00194b', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 12, height: 10 }, elevation: 14 },
  screen: { flex: 1, borderWidth: 3, borderColor: '#0b1734', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  notch: { position: 'absolute', top: 7, width: '30%', height: 8, borderRadius: 99, backgroundColor: '#0b1734' },
  screenSpark: { fontSize: 70, color: 'rgba(255,255,255,0.8)', textShadowColor: '#9fecff', textShadowRadius: 30, transform: [{ rotate: '10deg' }] },
  floatingSpark: { position: 'absolute', right: '15%', top: '12%', fontSize: 50, color: '#d4efff', textShadowColor: '#827bfb', textShadowOffset: { width: 2, height: 4 }, textShadowRadius: 1 },
  coinEdge: { borderRadius: 999, shadowColor: '#cb8823', shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 9, height: 6 }, elevation: 10 },
  coin: { width: 170, height: 170, borderRadius: 85, borderWidth: 6, borderColor: '#ffea9d', alignItems: 'center', justifyContent: 'center' },
  coinText: { fontSize: 62, color: '#9f681a', textShadowColor: '#ffe89c', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
  orbit: { position: 'absolute', width: 210, height: 80, borderRadius: 105, borderWidth: 1, borderColor: 'rgba(188,236,255,0.25)', borderTopColor: '#cff6ff', transform: [{ rotate: '-25deg' }] },
  vibe: { width: 220, height: 220 },
  caption: { fontSize: 14, color: '#d2e1ff', textAlign: 'center', minHeight: 20 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%' },
  grid3: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  choice: { flexGrow: 1, flexBasis: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 48, borderWidth: 1, borderColor: 'rgba(255,255,255,0.27)', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 8 },
  choiceOn: { backgroundColor: D.yellow, borderColor: '#ffe784', borderBottomWidth: 4, borderBottomColor: '#d4a62b', transform: [{ translateY: -2 }] },
  budget: { minWidth: 200, fontSize: 44, letterSpacing: -2, textAlign: 'center', color: '#fff', borderBottomWidth: 2, borderBottomColor: 'rgba(255,255,255,0.33)', paddingVertical: 4 },
  preset: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.21)', backgroundColor: 'rgba(255,255,255,0.07)' },
  check: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#c4d9ff', alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24, width: '100%' },
  back: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  mode: { fontSize: 10, lineHeight: 14, color: '#bfd3ff', textAlign: 'center', marginBottom: 10 },
  empty: { padding: 24, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.93)', marginVertical: 12 },
  card: { alignItems: 'center', gap: 6, paddingVertical: 16, paddingHorizontal: 22, borderRadius: 26, borderWidth: 1, borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.86)', shadowColor: '#00185f', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 16 }, elevation: 10 },
  page: { width: 32, height: 36, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.33)', backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  finish: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(192,232,255,0.33)', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12 },
  adjust: { borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.09)', padding: 10, minHeight: 40, justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,22,67,0.6)', paddingHorizontal: 14 },
  dialog: { flex: 1, maxHeight: '85%', borderRadius: 24, padding: 24, backgroundColor: '#fff' },
  dialogClose: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', borderRadius: 12, backgroundColor: '#edf2ff', paddingHorizontal: 16 },
  dialogTitle: { fontSize: 20, color: '#233956', marginTop: 10, marginBottom: 18 },
  dialogText: { fontSize: 13, lineHeight: 21, color: '#233956', marginVertical: 6 },
  option: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  compare: { flexDirection: 'row', gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
});
