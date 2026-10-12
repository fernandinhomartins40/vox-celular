import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { requestForSession, sessionRevision } from '../src/api';

type Preferences = { personalizacao: boolean; notificacoes: boolean; versaoAviso: string };
export default function Privacy() {
  const [saved, setSaved] = useState<Preferences | null>(null);
  const [draft, setDraft] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  const listedRevision = useRef(-1);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError(''); setMessage('');
    const revision = sessionRevision();
    requestForSession<Preferences>(revision, '/privacidade/preferencias')
      .then(data => { if (active) { listedRevision.current = revision; setSaved(data); setDraft(data); } })
      .catch(e => { if (active) { setSaved(null); setDraft(null); setError(e instanceof Error ? e.message : 'Não foi possível consultar suas preferências.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]));
  async function save() {
    if (!draft || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await requestForSession<Preferences>(listedRevision.current, '/privacidade/preferencias', { personalizacao: draft.personalizacao, notificacoes: draft.notificacoes, versaoAviso: draft.versaoAviso }, 'PUT');
      setSaved(result); setDraft(result); setMessage('Suas preferências foram salvas.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar. Suas preferências anteriores continuam valendo.'); }
    finally { setBusy(false); }
  }
  const changed = saved && draft && (saved.personalizacao !== draft.personalizacao || saved.notificacoes !== draft.notificacoes);
  return <ScrollView contentContainerStyle={styles.screen}>
    <Text accessibilityRole="header" style={styles.heading}>Privacidade</Text>
    <Text style={styles.description}>Você escolhe. É possível retirar estas autorizações a qualquer momento, sem perder acesso às compras.</Text>
    {loading && <ActivityIndicator color="#0036cc" accessibilityLabel="Consultando preferências" />}
    {error && <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Link href="/conta" style={styles.link}>Ir para minha conta</Link></View>}
    {!loading && draft && <View style={styles.card}>
      <View style={styles.option}><Text style={styles.label}>Personalizar recomendações</Text><Switch accessibilityLabel="Personalizar recomendações" value={draft.personalizacao} disabled={busy} onValueChange={value => { setDraft(previous => previous && { ...previous, personalizacao: value }); setMessage(''); }} trackColor={{ false: '#77849a', true: '#0036cc' }} /></View>
      <Text style={styles.description}>Autorizar o uso das suas preferências para recomendações personalizadas. Não autoriza compartilhar senhas ou dados de pagamento.</Text>
      <View style={styles.option}><Text style={styles.label}>Receber notificações</Text><Switch accessibilityLabel="Receber notificações" value={draft.notificacoes} disabled={busy} onValueChange={value => { setDraft(previous => previous && { ...previous, notificacoes: value }); setMessage(''); }} trackColor={{ false: '#77849a', true: '#0036cc' }} /></View>
      <Text style={styles.description}>Registrar seu consentimento para notificações da Vox. A permissão do aparelho é separada; a entrega de push ainda não está ativada neste aplicativo.</Text>
      <Text style={styles.description}>Versão do aviso: {draft.versaoAviso}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || !changed }} disabled={busy || !changed} onPress={save} style={[styles.button, (busy || !changed) && styles.disabled]}><Text style={styles.buttonText}>{busy ? 'Salvando…' : 'Salvar preferências'}</Text></Pressable>
      {changed && <Text style={styles.description}>Há alterações para salvar.</Text>}
      {message && <Text accessibilityLiveRegion="polite" style={styles.description}>{message}</Text>}
    </View>}
    {!loading && !draft && <Pressable accessibilityRole="button" onPress={() => setReload(value => value + 1)} style={styles.button}><Text style={styles.buttonText}>Tentar novamente</Text></Pressable>}
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { padding: 20, paddingBottom: 40 }, heading: { color: '#10243e', fontSize: 25, fontWeight: '700', marginBottom: 16 }, description: { color: '#52647b', marginBottom: 16, lineHeight: 22 }, card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#dce4f3' }, option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, marginBottom: 8 }, label: { flex: 1, fontSize: 17, fontWeight: '600', color: '#10243e' }, button: { backgroundColor: '#0036cc', borderRadius: 12, padding: 14, minHeight: 48, marginBottom: 16 }, buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' }, disabled: { opacity: 0.5 }, error: { color: '#9c1230' }, link: { color: '#0036cc', paddingVertical: 14 } });
