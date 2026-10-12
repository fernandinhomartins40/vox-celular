import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { clearLocalSession, request } from '../src/api';
export default function Password() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const sending = useRef(false);
  async function change() {
    if (sending.current) return;
    setError('');
    if (!current || next.length < 12 || next.length > 72 || next !== confirmation) { setError('Informe a senha atual e confirme uma nova senha de 12 a 72 caracteres.'); return; }
    sending.current = true; setBusy(true);
    try {
      await request('/auth/senha', { senhaAtual: current, novaSenha: next }, true, 'PATCH');
      setDone(true); setCurrent(''); setNext(''); setConfirmation('');
      try { await clearLocalSession(); } catch { setError('Senha alterada no servidor. Não foi possível limpar o armazenamento local; entre novamente com a nova senha.'); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível alterar. Confira os acessos e tente novamente.'); }
    finally { sending.current = false; setBusy(false); }
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled"><Text accessibilityRole="header" style={styles.heading}>Alterar senha</Text>{error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}<View style={styles.card}>{done ? <><Text accessibilityRole="header" style={styles.heading}>Senha alterada</Text><Text style={styles.text}>Os acessos anteriores foram invalidados. Entre novamente com a nova senha.</Text><Link href="/conta" style={styles.link}>Entrar na minha conta</Link></> : <><Text style={styles.text}>Use de 12 a 72 caracteres. A alteração invalida os acessos anteriores da sua conta.</Text>{([['Senha atual', current, setCurrent, 'current-password'], ['Nova senha', next, setNext, 'new-password'], ['Confirme a nova senha', confirmation, setConfirmation, 'new-password']] as const).map(([label, value, setter, complete]) => <View key={label}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={setter} autoComplete={complete} secureTextEntry={!show} maxLength={72} editable={!busy} style={styles.input} /></View>)}<Pressable accessibilityRole="button" disabled={busy} onPress={() => setShow(value => !value)} style={{ minHeight: 48, paddingVertical: 14 }}><Text style={styles.link}>{show ? 'Ocultar senhas' : 'Mostrar senhas'}</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={change} style={[styles.button, busy && { opacity: 0.5 }]}><Text style={styles.buttonText}>{busy ? 'Alterando…' : 'Confirmar alteração'}</Text></Pressable></>}</View></ScrollView></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ screen: { padding: 20, paddingBottom: 40 }, heading: { fontSize: 25, fontWeight: '700', color: '#10243e', marginBottom: 16 }, text: { color: '#52647b', lineHeight: 22, marginBottom: 16 }, card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce4f3', padding: 20, borderRadius: 16 }, label: { color: '#10243e', fontWeight: '600', marginBottom: 8 }, input: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: '#dce4f3', borderRadius: 12, fontSize: 16, marginBottom: 16 }, button: { backgroundColor: '#0036cc', minHeight: 48, padding: 14, borderRadius: 12 }, buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' }, error: { color: '#9c1230', marginBottom: 12 }, link: { color: '#0036cc', paddingVertical: 14 } });
