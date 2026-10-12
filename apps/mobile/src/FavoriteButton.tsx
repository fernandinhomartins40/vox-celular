import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { request } from './api';
export default function FavoriteButton({ productId }: { productId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function save() {
    setBusy(true); setError(''); setMessage('');
    try { await request(`/favoritos/${encodeURIComponent(productId)}`, {}, true, 'PUT'); setMessage('Salvo nos seus favoritos.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  }
  return <View style={{ marginTop: 12 }}><Pressable accessibilityRole="button" disabled={busy} onPress={save} style={{ minHeight: 48, paddingVertical: 14 }}><Text style={{ color: '#0036cc', fontWeight: '700' }}>{busy ? 'Salvando…' : 'Salvar nos favoritos'}</Text></Pressable>{message && <Text accessibilityLiveRegion="polite">{message}</Text>}{error && <><Text accessibilityRole="alert" style={{ color: '#9c1230' }}>{error}</Text><Link href="/conta" style={{ color: '#0036cc', paddingVertical: 14 }}>Ir para minha conta</Link></>}</View>;
}
