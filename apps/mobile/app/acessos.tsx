import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { request, sessionRevision } from '../src/api';
type Session = { id: string; createdAt: string; expiresAt: string; atual: boolean };
const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value));
export default function Accesses() {
  const [rows, setRows] = useState<Session[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  const listedRevision = useRef(-1);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError('');
    const revision = sessionRevision();
    request<Session[]>('/auth/sessoes', undefined, true).then(data => { if (active) { listedRevision.current = revision; setRows(data); } }).catch(e => { if (active) { setRows(null); setError(e instanceof Error ? e.message : 'Não foi possível consultar os acessos.'); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]));
  async function revoke(id: string) {
    setBusy(true); setError(''); setMessage('');
    try {
      if (listedRevision.current !== sessionRevision()) throw new Error('Sua conta mudou. Atualize os acessos antes de continuar.');
      await request(`/auth/sessoes/${encodeURIComponent(id)}`, undefined, true, 'DELETE');
      setRows(previous => previous?.filter(row => row.id !== id) || []);
      setMessage('Acesso encerrado no servidor.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível encerrar. Tente novamente.'); }
    finally { setBusy(false); }
  }
  return <ScrollView contentContainerStyle={styles.screen}><Text accessibilityRole="header" style={styles.heading}>Acessos da minha conta</Text><Text style={styles.text}>Veja quando cada acesso começou. Se não reconhecer um acesso, encerre-o. As datas usam o horário de Brasília.</Text>
    {loading && <ActivityIndicator color="#0036cc" accessibilityLabel="Consultando acessos" />}
    {error && <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Link href="/conta" style={styles.link}>Ir para minha conta</Link></View>}
    {message && <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text>}
    <Pressable accessibilityRole="button" disabled={busy || loading} onPress={() => { setMessage(''); setReload(value => value + 1); }} style={styles.button}><Text style={styles.buttonText}>Atualizar acessos</Text></Pressable>
    {!loading && rows?.length === 0 && <Text style={styles.text}>Nenhum acesso ativo encontrado.</Text>}
    {!loading && rows?.map(row => <View key={row.id} style={styles.card}><Text style={styles.title}>{row.atual ? 'Este acesso' : 'Outro acesso'}</Text><Text style={styles.text}>Início: {date(row.createdAt)}</Text><Text style={styles.text}>Expira em: {date(row.expiresAt)}</Text>{row.atual ? <Text style={styles.text}>Para sair deste acesso, use Sair da conta em Minha conta.</Text> : <Pressable accessibilityRole="button" disabled={busy} onPress={() => Alert.alert('Encerrar este acesso?', 'Será necessário entrar novamente no aparelho ou navegador que usa este acesso.', [{ text: 'Manter acesso', style: 'cancel' }, { text: 'Encerrar acesso', style: 'destructive', onPress: () => revoke(row.id) }])} style={styles.button}><Text style={styles.buttonText}>Encerrar acesso</Text></Pressable>}</View>)}
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { padding: 20, paddingBottom: 40 }, heading: { fontSize: 25, fontWeight: '700', color: '#10243e', marginBottom: 16 }, title: { fontSize: 18, fontWeight: '700', color: '#10243e', marginBottom: 12 }, text: { color: '#52647b', lineHeight: 22, marginBottom: 12 }, card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#dce4f3', marginBottom: 16 }, button: { backgroundColor: '#0036cc', padding: 14, borderRadius: 12, minHeight: 48, marginBottom: 12 }, buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' }, error: { color: '#9c1230', marginBottom: 12 }, link: { color: '#0036cc', paddingVertical: 14 } });
