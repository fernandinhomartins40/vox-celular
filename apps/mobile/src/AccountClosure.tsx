import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { requestForSession, sessionRevision } from './api';

type Closure = { id: string; status: string; createdAt: string };
export default function AccountClosure() {
  const [row, setRow] = useState<Closure | null>(null);
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const scope = useRef<{ revision: number; active: boolean; sending: boolean } | null>(null);
  useFocusEffect(useCallback(() => {
    const current = { revision: sessionRevision(), active: true, sending: false };
    scope.current = current;
    setRow(null); setPassword(''); setConfirmed(false); setError(''); setBusy(false); setLoading(true);
    requestForSession<{ solicitacao: Closure | null }>(current.revision, '/privacidade/encerramento')
      .then(result => { if (current.active && current.revision === sessionRevision()) setRow(result.solicitacao); })
      .catch(e => { if (current.active && current.revision === sessionRevision()) setError(e instanceof Error ? e.message : 'Não foi possível consultar.'); })
      .finally(() => { if (current.active && current.revision === sessionRevision()) setLoading(false); });
    return () => { current.active = false; setPassword(''); };
  }, [reload]));
  async function send() {
    const current = scope.current;
    if (!current?.active || current.sending || current.revision !== sessionRevision() || !confirmed || !password || row) return;
    current.sending = true; setBusy(true); setError('');
    const active = () => current.active && scope.current === current && current.revision === sessionRevision();
    try {
      const result = await requestForSession<{ solicitacao: Closure }>(current.revision, '/privacidade/encerramento', { senhaAtual: password, confirmacao: 'SOLICITAR_ENCERRAMENTO' });
      if (active()) setRow(result.solicitacao);
    } catch (e) { if (active()) setError(e instanceof Error ? e.message : 'Não foi possível confirmar. Consulte o status antes de tentar novamente.'); }
    finally { current.sending = false; if (active()) { setPassword(''); setBusy(false); } }
  }
  const disabled = loading || busy || !confirmed || !password || !!error;
  return <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#dce4f3', marginTop: 16 }}>
    <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '700', color: '#10243e', marginBottom: 12 }}>Encerramento da conta</Text>
    <Text style={{ color: '#52647b', lineHeight: 22, marginBottom: 12 }}>Você pode registrar uma solicitação. A conta continua ativa até a conclusão do processo. Pedidos e registros comerciais serão preservados nesta etapa.</Text>
    {loading && <ActivityIndicator accessibilityLabel="Consultando solicitação" color="#0036cc" />}
    {error && <><Text accessibilityRole="alert" style={{ color: '#9c1230' }}>{error}</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => setReload(value => value + 1)} style={{ minHeight: 48, paddingVertical: 14 }}><Text style={{ color: '#0036cc' }}>Consultar status e tentar novamente</Text></Pressable></>}
    {!loading && row ? <View><Text accessibilityLiveRegion="polite" style={{ fontWeight: '600', color: '#10243e' }}>{row.status === 'SOLICITADA' ? 'Solicitação registrada' : row.status === 'EM_ANALISE' ? 'Solicitação em análise' : `Status: ${row.status}`}</Text><Text selectable style={{ marginTop: 8 }}>Protocolo: {row.id}</Text><Text style={{ color: '#52647b', marginTop: 8 }}>Esta confirmação não significa que a conta foi excluída.</Text></View> : !loading && !error && <>
      <Text style={{ color: '#10243e', marginBottom: 8 }}>Senha atual</Text>
      <TextInput accessibilityLabel="Senha atual para solicitar encerramento" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={72} editable={!busy} style={{ minHeight: 48, borderWidth: 1, borderColor: '#dce4f3', borderRadius: 12, padding: 12, marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}><Text style={{ flex: 1, color: '#52647b' }}>Entendi e quero solicitar o encerramento.</Text><Switch accessibilityLabel="Confirmar solicitação de encerramento" value={confirmed} onValueChange={setConfirmed} disabled={busy} /></View>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={send} style={{ minHeight: 48, borderRadius: 12, backgroundColor: '#0036cc', padding: 14, opacity: disabled ? 0.5 : 1 }}><Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>{busy ? 'Registrando…' : 'Registrar solicitação'}</Text></Pressable>
    </>}
  </View>;
}
