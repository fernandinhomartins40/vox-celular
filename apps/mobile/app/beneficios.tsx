import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { request, sessionRevision } from '../src/api';
import { pendingReward, redeemReward } from '../src/rewards';
type Points = { saldo: number; nivel: string; recompensas: { id: string; titulo: string; pontos: number }[]; resgates: { id: string; codigo: string; usadoEm: string | null; recompensa: { titulo: string } }[]; historico: { id: string; pontos: number; descricao: string }[] };
export default function Benefits() {
  const [data, setData] = useState<Points | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [reload, setReload] = useState(0);
  const listedRevision = useRef(-1);
  const sending = useRef(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError('');
    const revision = sessionRevision();
    Promise.all([request<Points>('/fidelidade/pontos', undefined, true), pendingReward()]).then(([points, attempt]) => { if (active) { listedRevision.current = revision; setData(points); setPending(attempt?.rewardId || null); } }).catch(e => { if (active) { setData(null); setError(e instanceof Error ? e.message : 'Não foi possível consultar os benefícios.'); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]));
  async function redeem(id: string, points?: number) {
    if (sending.current) return;
    sending.current = true; setBusy(true); setError(''); setCode('');
    try {
      if (listedRevision.current !== sessionRevision()) throw new Error('Sua conta mudou. Atualize os benefícios antes de continuar.');
      const result = await redeemReward(id, points);
      setCode(result.codigo); setPending(null); setData(previous => previous && { ...previous, saldo: result.saldo });
      setReload(value => value + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível confirmar.');
      try { setPending((await pendingReward())?.rewardId || null); } catch { /* Keep failure visible. */ }
    } finally { sending.current = false; setBusy(false); }
  }
  return <ScrollView contentContainerStyle={styles.screen}><Text accessibilityRole="header" style={styles.heading}>Meus benefícios</Text><Text style={styles.text}>Escolha uma recompensa, confirme o uso dos pontos e apresente o código na loja.</Text>
    {error && <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Link href="/conta" style={styles.link}>Ir para minha conta</Link></View>}
    {loading && <ActivityIndicator color="#0036cc" />}
    {code && <View style={styles.card}><Text accessibilityRole="header" style={styles.title}>Resgate confirmado</Text><Text selectable style={styles.title}>{code}</Text><Text style={styles.text}>Apresente este código na loja. Ele também aparece em Meus códigos.</Text></View>}
    <Pressable accessibilityRole="button" disabled={busy || loading} onPress={() => setReload(value => value + 1)} style={styles.button}><Text style={styles.buttonText}>Atualizar benefícios</Text></Pressable>
    {!loading && data && <><View style={styles.card}><Text style={styles.title}>{data.saldo} pontos · {data.nivel}</Text></View>
      {pending && <View style={styles.card}><Text style={styles.text}>Há uma confirmação pendente. Verifique o resultado antes de iniciar outro resgate.</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => redeem(pending)} style={styles.button}><Text style={styles.buttonText}>Verificar resgate pendente</Text></Pressable></View>}
      <Text accessibilityRole="header" style={styles.title}>Recompensas</Text>{!data.recompensas.length && <Text style={styles.text}>Nenhuma recompensa disponível no momento.</Text>}{data.recompensas.map(reward => <View key={reward.id} style={styles.card}><Text style={styles.title}>{reward.titulo}</Text><Text style={styles.text}>{reward.pontos} pontos</Text><Pressable accessibilityRole="button" disabled={busy || !!pending || data.saldo < reward.pontos} onPress={() => Alert.alert('Confirmar resgate?', `${reward.titulo} usa ${reward.pontos} pontos.`, [{ text: 'Voltar', style: 'cancel' }, { text: 'Usar meus pontos', onPress: () => redeem(reward.id, reward.pontos) }])} style={[styles.button, (busy || !!pending || data.saldo < reward.pontos) && { opacity: 0.5 }]}><Text style={styles.buttonText}>{data.saldo < reward.pontos ? 'Pontos insuficientes' : 'Resgatar recompensa'}</Text></Pressable></View>)}
      <Text accessibilityRole="header" style={styles.title}>Meus códigos</Text>{!data.resgates.length && <Text style={styles.text}>Você ainda não tem resgates.</Text>}{data.resgates.map(receipt => <View key={receipt.id} style={styles.card}><Text style={styles.title}>{receipt.recompensa.titulo}</Text><Text selectable style={styles.title}>{receipt.codigo}</Text><Text style={styles.text}>{receipt.usadoEm ? 'Código já utilizado' : 'Código ainda não marcado como utilizado'}</Text></View>)}<Text accessibilityRole="header" style={styles.title}>Últimos movimentos</Text>{data.historico.map(event => <Text key={event.id} style={styles.text}>{event.pontos > 0 ? '+' : ''}{event.pontos} · {event.descricao}</Text>)}
    </>}
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { padding: 20, paddingBottom: 40 }, heading: { color: '#10243e', fontSize: 25, fontWeight: '700', marginBottom: 16 }, title: { color: '#10243e', fontSize: 19, fontWeight: '700', marginBottom: 12 }, text: { color: '#52647b', lineHeight: 22, marginBottom: 12 }, card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce4f3', borderRadius: 16, padding: 20, marginBottom: 16 }, button: { backgroundColor: '#0036cc', minHeight: 48, padding: 14, borderRadius: 12, marginBottom: 12 }, buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' }, error: { color: '#9c1230', marginBottom: 12 }, link: { color: '#0036cc', paddingVertical: 14 } });
