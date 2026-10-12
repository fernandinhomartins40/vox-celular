import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { request } from '../src/api';
import { Cart, changeCart, confirmCart, readCart, Receipt } from '../src/cart';
type Product = { id: string; nome: string; preco: number; estoque: number };
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
export default function ShoppingCart() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(2);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [reload, setReload] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError('');
    (async () => {
      const saved = await readCart();
      if (active) { setCart(saved); setProducts([]); setStep(saved.pending ? 3 : 2); }
      const rows = saved.storeId ? await request<Product[]>(`/produtos?lojaId=${encodeURIComponent(saved.storeId)}`) : [];
      if (active) { setCart(saved); setProducts(rows); setStep(saved.pending ? 3 : 2); }
    })().catch(e => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível consultar o carrinho.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]));
  const rows = (cart?.items || []).map(item => ({ ...item, product: products.find(product => product.id === item.produtoId) }));
  const unavailable = rows.some(row => !row.product || row.product.estoque < row.qty);
  const total = rows.reduce((sum, row) => sum + row.qty * (cart?.pending?.itens.find(item => item.produtoId === row.produtoId)?.precoCentavos ?? Math.round((row.product?.preco || 0) * 100)), 0) / 100;
  async function quantity(id: string, qty: number) {
    if (!cart || busy) return;
    setBusy(true); setError('');
    try { setCart(await changeCart(cart.storeId, id, qty)); setStep(2); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível ajustar.'); }
    finally { setBusy(false); }
  }
  async function confirm() {
    if (!cart || busy) return;
    setBusy(true); setError('');
    try {
      const result = await confirmCart(rows.map(row => ({ produtoId: row.produtoId, qty: row.qty, precoCentavos: Math.round((row.product?.preco || 0) * 100) })));
      setReceipt(result); setCart({ storeId: '', items: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível confirmar. Verifique a conexão e tente novamente.');
      try { setCart(await readCart()); } catch { /* Keep visible cart and original failure. */ }
    } finally { setBusy(false); }
  }
  const button = (label: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={action} style={[styles.button, disabled && { opacity: 0.5 }]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
  return <ScrollView contentContainerStyle={styles.screen}><Text accessibilityRole="header" style={styles.heading}>Seu carrinho</Text>
    {loading && <ActivityIndicator color="#0036cc" />}
    {error && <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Link href="/conta" style={styles.link}>Conferir minha conta</Link><Link href="/pedidos" style={styles.link}>Consultar meus pedidos</Link></View>}
    {receipt ? <View style={styles.card}><Text accessibilityRole="header" style={styles.title}>Pedido recebido</Text><Text selectable style={styles.text}>{receipt.codigo}</Text><Text style={styles.title}>{money(Number(receipt.total))}</Text><Text style={styles.text}>Pagamento: {receipt.pagamento}</Text><Text style={styles.text}>A confirmação do pedido não comprova pagamento. A loja combinará os próximos passos.</Text><Link href="/pedidos" style={styles.link}>Acompanhar pedido</Link><Link href="/loja" style={styles.link}>Voltar ao catálogo</Link></View> : !loading && cart && <>
      {!rows.length ? <View style={styles.card}><Text style={styles.text}>Seu carrinho está vazio.</Text><Link href="/loja" style={styles.link}>Escolher produtos</Link></View> : <>
        <Text accessibilityRole="header" style={styles.title}>Passo {step} de 3 · {step === 2 ? 'Revisar carrinho' : 'Confirmar pedido'}</Text>
        {cart.pending && <Text style={styles.text}>Existe uma confirmação pendente. Use a mesma conta para verificar o resultado. Repetir reutiliza a chave salva e não gera outro pedido.</Text>}
        {rows.map(row => <View key={row.produtoId} style={styles.card}><Text style={styles.title}>{row.product?.nome || 'Produto indisponível no catálogo'}</Text><Text style={styles.text}>{row.qty} unidade(s) · {cart.pending || row.product ? `${money((cart.pending?.itens.find(item => item.produtoId === row.produtoId)?.precoCentavos ?? Math.round((row.product?.preco || 0) * 100)) / 100)} cada` : 'Preço indisponível'}</Text>{!cart.pending && (!row.product || row.product.estoque < row.qty) && <Text style={styles.error}>Produto indisponível ou estoque insuficiente. Ajuste ou remova este item.</Text>}{step === 2 && !cart.pending && <View>{button('Adicionar uma unidade', () => quantity(row.produtoId, row.qty + 1), busy || !row.product || row.qty >= Math.min(100, row.product.estoque))}{button(row.qty > 1 ? 'Diminuir uma unidade' : 'Remover produto', () => quantity(row.produtoId, row.qty - 1), busy)}{row.qty > 1 && button('Remover produto', () => quantity(row.produtoId, 0), busy)}</View>}</View>)}
        <Text style={styles.title}>{!cart.pending && rows.some(row => !row.product) ? 'Atualize o catálogo para conferir o total.' : `Total: ${money(total)}`}</Text>
        {step === 2 ? <>{button('Atualizar preço e estoque', () => setReload(value => value + 1), busy)}{button('Continuar para confirmação', () => setStep(3), unavailable || busy)}</> : <View><Text style={styles.text}>O servidor confere os preços e reserva o estoque. Você verá um código de pedido somente após a confirmação. Não há cobrança automática.</Text>{button(busy ? 'Confirmando…' : cart.pending ? 'Verificar confirmação pendente' : 'Confirmar pedido', confirm, busy || (!cart.pending && unavailable))}{!cart.pending && button('Voltar ao carrinho', () => setStep(2), busy)}</View>}
      </>}
    </>}
    {!loading && !receipt && button('Recarregar carrinho', () => setReload(value => value + 1), busy)}
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { padding: 20, paddingBottom: 40 }, heading: { color: '#10243e', fontSize: 25, fontWeight: '700', marginBottom: 16 }, title: { color: '#10243e', fontSize: 19, fontWeight: '700', marginBottom: 12 }, text: { color: '#52647b', lineHeight: 22, marginBottom: 12 }, card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#dce4f3', marginBottom: 16 }, button: { backgroundColor: '#0036cc', borderRadius: 12, minHeight: 48, padding: 14, marginBottom: 12 }, buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' }, error: { color: '#9c1230', marginBottom: 12 }, link: { color: '#0036cc', paddingVertical: 14 } });
