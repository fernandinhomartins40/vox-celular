import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { Link } from 'expo-router';
import { request } from '../src/api';
export default function Recovery() {
  const [email, setEmail] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [sent, setSent] = useState(false);
  const active = useRef(false), running = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function submit() {
    if (running.current) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Informe um e-mail válido.'); return; }
    running.current = true; setBusy(true); setError('');
    try {
      const store = await request<{ id: string }>('/loja');
      if (!active.current) return;
      await request('/auth/recuperacao/solicitar', { lojaId: store.id, email: email.trim() });
      if (active.current) setSent(true);
    } catch (e) { if (active.current) setError(e instanceof Error ? e.message : 'Não foi possível solicitar. Tente novamente.'); }
    finally { running.current = false; if (active.current) setBusy(false); }
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled"><Text accessibilityRole="header" style={styles.heading}>Recuperar senha</Text><Text style={styles.text}>Informe o e-mail usado na sua conta. Você poderá escolher uma nova senha pelo link recebido.</Text>{sent ? <Text accessibilityLiveRegion="polite" style={styles.text}>Se houver uma conta com esse e-mail, você poderá receber um link. Confira também o spam. Abra o link no navegador para concluir.</Text> : <><Text style={styles.label}>E-mail da conta</Text><TextInput accessibilityLabel="E-mail da conta" autoComplete="email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} maxLength={254} editable={!busy} style={styles.input} onSubmitEditing={submit} />{error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}<Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={submit} style={[styles.button, busy && { opacity: 0.5 }]}><Text style={styles.buttonText}>{busy ? 'Aguarde…' : 'Solicitar link'}</Text></Pressable></>}<Link href="/conta" style={styles.link}>Voltar para entrar</Link></ScrollView></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ screen: { padding: 20, paddingBottom: 40 }, heading: { fontSize: 25, color: '#10243e', fontWeight: '700', marginBottom: 16 }, text: { color: '#52647b', marginBottom: 16, lineHeight: 22 }, label: { color: '#10243e', fontWeight: '600', marginBottom: 8 }, input: { minHeight: 48, borderWidth: 1, borderColor: '#dce4f3', borderRadius: 12, padding: 12, fontSize: 16, backgroundColor: '#fff', marginBottom: 16 }, button: { minHeight: 48, padding: 14, backgroundColor: '#0036cc', borderRadius: 12 }, buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' }, link: { color: '#0036cc', minHeight: 48, paddingVertical: 16 }, error: { color: '#9c1230', marginBottom: 16 } });
