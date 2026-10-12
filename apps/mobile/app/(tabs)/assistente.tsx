import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { assetUrl, request } from '../../src/api';
import { addToCart } from '../../src/cart';
import FavoriteButton from '../../src/FavoriteButton';
type Attributes = { tipo?: string; verificado?: boolean; ramGB?: number; armazenamentoGB?: number; bateriaMah?: number };
type Product = { id: string; nome: string; lojaId: string; categoria: string; preco: number; estoque: number; imgUrl: string; atributosTecnicos?: Attributes };
type Result = { produto: Product; motivos: string[]; fonte: string | null; observacao: string };
type Response = { aviso: string; mensagem: string | null; catalogoLimitado: boolean; resultados: Result[] };
export default function Assistant() {
  const [step, setStep] = useState(1);
  const [budget, setBudget] = useState('');
  const [type, setType] = useState('celular');
  const [use, setUse] = useState('nao-sei');
  const [ram, setRam] = useState(0);
  const [storage, setStorage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [externalAi, setExternalAi] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<Response | null>(null);
  const amount = Number(budget.replace(',', '.'));
  async function recommend() {
    setBusy(true); setError(''); setMessage('');
    try {
      const store = await request<{ id: string }>('/loja');
      const needs = { lojaId: store.id, tipo: type, orcamento: amount, uso: use, ...(ram ? { ramMinima: ram } : {}), ...(storage ? { armazenamentoMinimo: storage } : {}) };
      const result = await request<Response>(externalAi ? '/assistente/recomendar-ia' : '/assistente/recomendar', externalAi ? { necessidades: needs, autorizaProcessamentoExterno: true } : needs);
      setResponse(result); setStep(3);
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível consultar as opções.'); }
    finally { setBusy(false); }
  }
  async function add(product: Product) {
    setAdding(true); setError(''); setMessage('');
    try {
      const catalog = await request<Product[]>(`/produtos?lojaId=${encodeURIComponent(product.lojaId)}`);
      const current = catalog.find(row => row.id === product.id);
      const attributes = current?.atributosTecnicos;
      const currentType = attributes?.tipo || ({ Celulares: 'celular', Tablets: 'tablet' } as Record<string, string>)[current?.categoria || ''];
      if (!current || current.lojaId !== product.lojaId || current.estoque < 1 || !Number.isFinite(current.preco) || Math.round(current.preco * 100) > Math.floor(amount * 100 + 0.000001) || currentType !== type || (ram && (!attributes?.verificado || !attributes.ramGB || attributes.ramGB < ram)) || (storage && (!attributes?.verificado || !attributes.armazenamentoGB || attributes.armazenamentoGB < storage))) throw new Error('A disponibilidade ou as características mudaram. Atualize as opções antes de decidir.');
      if (current.preco !== product.preco) throw new Error('O preço mudou. Atualize as opções para conferir o novo valor.');
      await addToCart(current.lojaId, current.id, current.estoque);
      setMessage(`${current.nome} adicionado ao carrinho.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível adicionar.'); }
    finally { setAdding(false); }
  }
  const choices = (options: [string, string][], selected: string, choose: (value: string) => void) => <View>{options.map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: selected === value }} onPress={() => choose(value)} style={[styles.option, selected === value && styles.selected]}><Text style={styles.text}>{label}</Text></Pressable>)}</View>;
  const button = (label: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={action} style={[styles.button, disabled && { opacity: 0.5 }]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
  return <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled"><Text accessibilityRole="header" style={styles.heading}>Ajude-me a escolher</Text><Text style={styles.text}>Três etapas para encontrar opções do catálogo. Seleção pelas regras da loja, com apoio de IA externa somente se você autorizar.</Text><Text accessibilityRole="header" style={styles.title}>Passo {step} de 3</Text>
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {message && <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text>}
    {step === 1 && <View style={styles.card}><Text style={styles.label}>Quanto deseja gastar, no máximo?</Text><TextInput accessibilityLabel="Orçamento máximo em reais" keyboardType="decimal-pad" value={budget} onChangeText={setBudget} placeholder="Ex.: 2000,00" maxLength={12} style={styles.input} /><Text style={styles.text}>Informe de R$ 0,01 a R$ 100.000. Sem separador de milhar.</Text><Text style={styles.label}>Qual aparelho procura?</Text>{choices([['celular', 'Celular'], ['tablet', 'Tablet']], type, setType)}{button('Continuar', () => { setError(''); if (!Number.isFinite(amount) || amount < 0.01 || amount > 100000) { setError('Informe um orçamento de R$ 0,01 a R$ 100.000.'); return; } setStep(2); })}</View>}
    {step === 2 && <View style={styles.card}><Text style={styles.label}>Como pretende usar?</Text>{choices([['dia-a-dia', 'Mensagens e tarefas do dia a dia'], ['trabalho', 'Trabalho e arquivos'], ['jogos', 'Jogos'], ['nao-sei', 'Não sei ainda']], use, setUse)}<Text style={styles.text}>RAM conferida ajuda a comparar opções; não garante desempenho em jogos específicos.</Text><Text style={styles.label}>RAM mínima (opcional)</Text>{choices([['0', 'Não sei / qualquer'], ['4', '4 GB'], ['8', '8 GB'], ['12', '12 GB']], String(ram), value => setRam(Number(value)))}<Text style={styles.label}>Armazenamento mínimo (opcional)</Text>{choices([['0', 'Não sei / qualquer'], ['128', '128 GB'], ['256', '256 GB'], ['512', '512 GB']], String(storage), value => setStorage(Number(value)))}<Text style={styles.label}>IA externa (opcional)</Text><Text style={styles.text}>Se autorizar, seu uso pretendido e dados técnicos dos candidatos serão enviados ao DeepSeek ou Qwen configurado pela loja. Não enviamos nome, telefone, histórico ou pagamento. Sem autorização, usamos regras locais.</Text><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: externalAi, disabled: busy }} disabled={busy} onPress={() => setExternalAi(value => !value)} style={styles.option}><Text style={styles.text}>{externalAi ? 'Autorizado' : 'Desmarcado'} · Autorizo processamento externo para esta consulta</Text></Pressable>{button(busy ? 'Consultando…' : 'Ver minhas opções', recommend, busy)}{button('Voltar ao orçamento', () => setStep(1), busy)}</View>}
    {step === 3 && response && <View><Text style={styles.text}>{response.aviso}</Text>{response.catalogoLimitado && <Text style={styles.text}>A consulta considerou até 500 produtos. Pode haver outras opções no catálogo.</Text>}{response.mensagem && <Text style={styles.text}>{response.mensagem}</Text>}{response.resultados.map(result => <View key={result.produto.id} style={styles.card}><Image source={{ uri: assetUrl(result.produto.imgUrl) }} style={{ height: 160, width: '100%' }} resizeMode="contain" accessibilityLabel={result.produto.nome} /><Text style={styles.title}>{result.produto.nome}</Text><Text style={styles.title}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result.produto.preco)}</Text>{result.motivos.map(reason => <Text key={reason} style={styles.text}>• {reason}</Text>)}{([['RAM', 'ramGB', 'GB'], ['Armazenamento', 'armazenamentoGB', 'GB'], ['Bateria', 'bateriaMah', 'mAh']] as const).map(([label, field, unit]) => <Text key={field} style={styles.text}>{label}: {result.produto.atributosTecnicos?.verificado && result.produto.atributosTecnicos[field] ? `${result.produto.atributosTecnicos[field]} ${unit}` : 'Não informado'}</Text>)}<Text style={styles.text}>{result.observacao}</Text>{result.fonte && <Text selectable style={styles.text}>Fonte: {result.fonte}</Text>}{button('Adicionar ao carrinho', () => add(result.produto), adding || busy)}<FavoriteButton productId={result.produto.id} /></View>)}{button(busy ? 'Atualizando…' : 'Atualizar opções', recommend, busy || adding)}{button('Ajustar minhas escolhas', () => { setStep(1); setExternalAi(false); setResponse(null); setError(''); setMessage(''); }, busy || adding)}<Link href="/carrinho" style={styles.link}>Ver meu carrinho</Link><Link href="/servicos" style={styles.link}>Preciso de um serviço</Link></View>}
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { padding: 20, paddingBottom: 40 }, heading: { fontSize: 25, fontWeight: '700', color: '#10243e', marginBottom: 16 }, title: { fontSize: 19, fontWeight: '700', color: '#10243e', marginBottom: 12 }, text: { color: '#52647b', lineHeight: 22, marginBottom: 12 }, label: { color: '#10243e', fontWeight: '600', marginBottom: 12 }, card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#dce4f3', padding: 20, marginBottom: 16 }, input: { borderWidth: 1, borderColor: '#dce4f3', borderRadius: 12, minHeight: 48, padding: 12, fontSize: 16, marginBottom: 12 }, option: { borderWidth: 1, borderColor: '#dce4f3', borderRadius: 12, padding: 14, minHeight: 48, marginBottom: 12 }, selected: { backgroundColor: '#edf1ff', borderColor: '#0036cc' }, button: { backgroundColor: '#0036cc', minHeight: 48, padding: 14, borderRadius: 12, marginBottom: 12 }, buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' }, error: { color: '#9c1230', marginBottom: 12 }, link: { color: '#0036cc', paddingVertical: 14 } });
