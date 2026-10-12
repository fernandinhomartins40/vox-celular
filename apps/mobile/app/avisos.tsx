import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { requestForSession, sessionRevision } from '../src/api';
type Notice = { id: string; titulo: string; mensagem: string; destino: string; createdAt: string };
const destinations = { '/pedidos': '/pedidos', '/servicos': '/servicos', '/beneficios': '/beneficios' } as const;
export default function Notices() {
  const [rows, setRows] = useState<Notice[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setRows(null); setLoading(true); setError('');
    requestForSession<Notice[]>(sessionRevision(), '/notificacoes').then(data => { if (active) setRows(data); }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível consultar os avisos.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]));
  return <ScrollView contentContainerStyle={styles.screen}><Text accessibilityRole="header" style={styles.heading}>Meus avisos</Text><Text style={styles.text}>Atualizações recentes da sua conta. Esta lista não significa que o aparelho recebeu uma notificação push.</Text>{loading && <ActivityIndicator color="#0036cc" accessibilityLabel="Consultando avisos" />}{error && <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Link href="/conta" style={styles.link}>Ir para minha conta</Link></View>}<Pressable accessibilityRole="button" disabled={loading} onPress={() => setReload(value => value + 1)} style={styles.button}><Text style={styles.buttonText}>Atualizar avisos</Text></Pressable>{!loading && rows?.length === 0 && <View style={styles.card}><Text style={styles.text}>Nenhum aviso disponível. Confira sua preferência de notificações para receber futuras atualizações.</Text><Link href="/privacidade" style={styles.link}>Consultar minhas preferências</Link></View>}{rows?.map(row => <View key={row.id} style={styles.card}><Text accessibilityRole="header" style={styles.title}>{row.titulo}</Text><Text style={styles.text}>{row.mensagem}</Text><Text style={styles.text}>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(row.createdAt))} (Brasília)</Text>{Object.hasOwn(destinations, row.destino) && <Link href={destinations[row.destino as keyof typeof destinations]} style={styles.link}>Ver detalhes na minha conta</Link>}</View>)}</ScrollView>;
}
const styles = StyleSheet.create({ screen: { padding: 20, paddingBottom: 40 }, heading: { fontSize: 25, fontWeight: '700', color: '#10243e', marginBottom: 16 }, title: { fontSize: 19, fontWeight: '700', color: '#10243e', marginBottom: 12 }, text: { color: '#52647b', lineHeight: 22, marginBottom: 12 }, card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#dce4f3', marginBottom: 16 }, button: { minHeight: 48, backgroundColor: '#0036cc', padding: 14, borderRadius: 12, marginBottom: 16 }, buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' }, error: { color: '#9c1230', marginBottom: 12 }, link: { color: '#0036cc', paddingVertical: 14 } });
