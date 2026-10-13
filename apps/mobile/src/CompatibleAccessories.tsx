import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { request } from './api';
import { addToCart } from './cart';
type Pair = { id: string; observacao: string; acessorio: { id: string; nome: string }; aparelho: { id: string } };
type Product = { id: string; lojaId: string; nome: string; preco: number; estoque: number };
export default function CompatibleAccessories({ product }: { product: { id: string; lojaId: string } }) {
  const [rows, setRows] = useState<Pair[] | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const mounted = useRef(false), operation = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const path = `/compatibilidades?lojaId=${encodeURIComponent(product.lojaId)}&produtoId=${encodeURIComponent(product.id)}`;
  async function run(pair?: Pair) {
    if (operation.current || !mounted.current) return;
    operation.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const current = await request<Pair[]>(path);
      if (!mounted.current) return;
      setRows(current.filter(row => row.aparelho.id === product.id));
      if (!pair) return;
      if (!current.some(row => row.aparelho.id === product.id && row.acessorio.id === pair.acessorio.id)) throw new Error('A compatibilidade mudou. Consulte novamente antes de escolher.');
      const accessory = await request<Product>(`/produtos/${encodeURIComponent(pair.acessorio.id)}?lojaId=${encodeURIComponent(product.lojaId)}`);
      if (accessory.lojaId !== product.lojaId || accessory.estoque < 1 || !Number.isFinite(accessory.preco) || accessory.preco < 0) throw new Error('Este acessório não está disponível.');
      if (!mounted.current) return;
      const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(accessory.preco);
      const accepted = await new Promise<boolean>(resolve => Alert.alert('Adicionar acessório?', `${accessory.nome}: ${price}. Item opcional, com valor adicional ao orçamento do aparelho. O estoque será conferido ao finalizar.`, [{ text: 'Voltar', style: 'cancel', onPress: () => resolve(false) }, { text: 'Adicionar ao carrinho', onPress: () => resolve(true) }], { cancelable: true, onDismiss: () => resolve(false) }));
      if (!accepted || !mounted.current) return;
      await addToCart(product.lojaId, accessory.id, accessory.estoque);
      if (mounted.current) setMessage('Acessório adicionado ao carrinho.');
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'Não foi possível consultar os acessórios.'); }
    finally { operation.current = false; if (mounted.current) setBusy(false); }
  }
  const button = (label: string, action: () => void) => <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={action} style={{ minHeight: 48, paddingVertical: 14, opacity: busy ? 0.5 : 1 }}><Text style={{ color: '#0036cc', fontWeight: '600' }}>{label}</Text></Pressable>;
  return <View style={{ borderTopWidth: 1, borderColor: '#dce4f3', paddingTop: 12, marginTop: 12 }}>{button(busy ? 'Conferindo…' : 'Consultar acessórios compatíveis', () => { void run(); })}{rows?.length === 0 && <Text>Compatibilidade não informada. Confirme com a loja.</Text>}{rows?.map(pair => <View key={pair.id}><Text style={{ fontWeight: '600' }}>{pair.acessorio.nome}</Text><Text style={{ color: '#52647b', marginVertical: 8 }}>{pair.observacao}</Text>{button('Consultar preço e adicionar', () => { void run(pair); })}</View>)}{error && <Text accessibilityRole="alert" style={{ color: '#9c1230' }}>{error}</Text>}{message && <><Text accessibilityLiveRegion="polite">{message}</Text><Link href="/carrinho" style={{ color: '#0036cc', paddingVertical: 14 }}>Ver carrinho</Link></>}</View>;
}
