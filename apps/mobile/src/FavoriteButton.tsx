import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { requestForSession, sessionRevision } from './api';
export default function FavoriteButton({ productId }: { productId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const revision = useRef(sessionRevision());
  const operation = useRef<symbol | null>(null);
  useFocusEffect(useCallback(() => {
    revision.current = sessionRevision();
    operation.current = null;
    setBusy(false); setMessage(''); setError('');
    return () => { operation.current = null; };
  }, [productId]));
  async function save() {
    if (operation.current) return;
    const current = revision.current;
    const token = Symbol(); operation.current = token;
    const active = () => operation.current === token && revision.current === current && sessionRevision() === current;
    setBusy(true); setError(''); setMessage('');
    try { await requestForSession(current, `/favoritos/${encodeURIComponent(productId)}`, {}, 'PUT'); if (active()) setMessage('Salvo nos seus favoritos.'); }
    catch (e) { if (active()) setError(e instanceof Error ? e.message : 'Não foi possível salvar.'); }
    finally { if (active()) { operation.current = null; setBusy(false); } }
  }
  return <View style={{ marginTop: 12 }}><Pressable accessibilityRole="button" disabled={busy} onPress={save} style={{ minHeight: 48, paddingVertical: 14 }}><Text style={{ color: '#0036cc', fontWeight: '700' }}>{busy ? 'Salvando…' : 'Salvar nos favoritos'}</Text></Pressable>{message && <><Text accessibilityLiveRegion="polite">{message}</Text><Link href="/favoritos" style={{ color: '#0036cc', paddingVertical: 14 }}>Ver meus favoritos</Link></>}{error && <><Text accessibilityRole="alert" style={{ color: '#9c1230' }}>{error}</Text><Link href="/conta" style={{ color: '#0036cc', paddingVertical: 14 }}>Ir para minha conta</Link></>}</View>;
}
