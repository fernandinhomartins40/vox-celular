import { panelStyles } from '../../src/panel';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { requestForSession, sessionRevision } from '../../src/api';
type Notice = { id: string; titulo: string; mensagem: string; destino: string; createdAt: string };
const destinations = { '/pedidos': '/pedidos', '/servicos': '/servicos', '/beneficios': '/beneficios' } as const;
const destinationLabels = { '/pedidos': 'Ver pedido', '/servicos': 'Ver atendimento', '/beneficios': 'Ver benefício' } as const;
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
  return <ScrollView contentContainerStyle={styles.screen}><Text accessibilityRole="header" style={styles.heading}>Meus avisos</Text><Text style={styles.text}>Acompanhe as novidades dos seus pedidos, atendimentos e benefícios.</Text>{loading && <ActivityIndicator color="#0036cc" accessibilityLabel="Consultando avisos" />}{error && <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Link href="/conta" style={styles.link}>Ir para minha conta</Link></View>}<Pressable accessibilityRole="button" disabled={loading} onPress={() => setReload(value => value + 1)} style={styles.button}><Text style={styles.buttonText}>Atualizar avisos</Text></Pressable>{!loading && rows?.length === 0 && <View style={styles.card}><Text style={styles.text}>Nenhum aviso disponível. Confira sua preferência de notificações para receber futuras atualizações.</Text><Link href="/privacidade" style={styles.link}>Consultar minhas preferências</Link></View>}{rows?.map(row => <View key={row.id} style={styles.card}><Text accessibilityRole="header" style={styles.title}>{row.titulo}</Text><Text style={styles.text}>{row.mensagem}</Text><Text style={styles.text}>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(row.createdAt))} (Brasília)</Text>{Object.hasOwn(destinations, row.destino) && <Link href={destinations[row.destino as keyof typeof destinations]} style={styles.link}>{destinationLabels[row.destino as keyof typeof destinationLabels]}</Link>}</View>)}</ScrollView>;
}
const styles = { ...StyleSheet.create({ screen: { padding: 20, paddingBottom: 40 }, heading: { fontSize: 25, fontFamily: 'DMSans_700Bold', color: '#14213d', marginBottom: 16 }, title: { fontSize: 19, fontFamily: 'DMSans_700Bold', color: '#14213d', marginBottom: 12 }, text: { color: '#4a5870', lineHeight: 22, marginBottom: 12 }, card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#dce3ef', marginBottom: 16 }, button: { minHeight: 48, backgroundColor: '#0825A3', padding: 14, borderRadius: 12, marginBottom: 16 }, buttonText: { color: '#fff', fontFamily: 'DMSans_700Bold', textAlign: 'center' }, error: { color: '#b91c1c', marginBottom: 12 }, link: { color: '#0825A3', paddingVertical: 14 } }), ...panelStyles };
