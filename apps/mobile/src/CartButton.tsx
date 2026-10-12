import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { addToCart } from './cart';
export default function CartButton({ storeId, productId, stock }: { storeId: string; productId: string; stock: number }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function add() {
    setBusy(true); setError(''); setMessage('');
    try { await addToCart(storeId, productId, stock); setMessage('Adicionado ao carrinho.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível adicionar.'); }
    finally { setBusy(false); }
  }
  return <View><Pressable accessibilityRole="button" disabled={busy || stock < 1} onPress={add} style={{ minHeight: 48, backgroundColor: '#0036cc', borderRadius: 12, padding: 14, opacity: busy || stock < 1 ? 0.5 : 1 }}><Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>{busy ? 'Adicionando…' : stock < 1 ? 'Sem estoque' : 'Adicionar ao carrinho'}</Text></Pressable>{message && <Text accessibilityLiveRegion="polite">{message}</Text>}{error && <Text accessibilityRole="alert" style={{ color: '#9c1230' }}>{error}</Text>}<Link href="/carrinho" style={{ color: '#0036cc', paddingVertical: 14 }}>Ver carrinho</Link></View>;
}
