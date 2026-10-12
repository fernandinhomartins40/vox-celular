import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { hasSavedSession, logout, NativeUser, request, saveSession, Session } from '../src/api';

export default function Account() {
  const [user, setUser] = useState<NativeUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    (async () => {
      try { if (await hasSavedSession()) { const profile = await request<NativeUser>('/auth/me', undefined, true); if (active) setUser(profile); } }
      catch (e) { if (active) setError(e instanceof Error ? e.message : 'Não foi possível recuperar a sessão.'); }
      finally { if (active) setBusy(false); }
    })();
    return () => { active = false; };
  }, []);
  async function login() {
    setBusy(true); setError('');
    try {
      if (!email.trim() || !password) throw new Error('Informe seu e-mail e sua senha.');
      const store = await request<{ id: string }>('/loja');
      const session = await request<Session>('/auth/login', { email: email.trim(), senha: password, lojaId: store.id, plataforma: 'native' });
      await saveSession(session);
      if (session.user.role !== 'CLIENTE') { await logout(); throw new Error('Este aplicativo é para clientes. Use o painel web para administrar a loja.'); }
      setUser(session.user); setPassword('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível entrar.'); }
    finally { setBusy(false); }
  }
  async function exit() {
    setBusy(true); setError('');
    try { await logout(); }
    catch { setError('Você saiu neste aparelho. Sem confirmação da rede, encerre este acesso pela lista de sessões ou altere a senha para revogar no servidor.'); }
    finally { setUser(null); setPassword(''); setBusy(false); }
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={styles.heading}>Minha conta</Text>
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {busy && <ActivityIndicator color="#0036cc" accessibilityLabel="Consultando sua conta" />}
    {user ? <View style={styles.card}><Text style={styles.heading}>{user.nome}</Text><Text style={styles.text}>{user.email}</Text><Link href="/pedidos" style={styles.link}>Consultar meus pedidos</Link><Link href="/favoritos" style={styles.link}>Meus favoritos e comparação</Link><Link href="/privacidade" style={styles.link}>Privacidade e preferências</Link><Pressable accessibilityRole="button" disabled={busy} onPress={exit} style={styles.button}><Text style={styles.buttonText}>Sair da conta</Text></Pressable></View> : <View style={styles.card}>
      <Text style={styles.text}>Entre com sua conta de cliente da Vox.</Text><Text nativeID="emailLabel" style={styles.label}>E-mail</Text><TextInput accessibilityLabel="E-mail" autoComplete="email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} style={styles.input} editable={!busy} />
      <Text style={styles.label}>Senha</Text><TextInput accessibilityLabel="Senha" autoComplete="current-password" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} style={styles.input} editable={!busy} onSubmitEditing={login} />
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showPassword }} disabled={busy} onPress={() => setShowPassword(value => !value)} style={styles.linkButton}><Text style={styles.link}>{showPassword ? 'Ocultar senha' : 'Mostrar senha'}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={login} style={[styles.button, busy && { opacity: 0.5 }]}><Text style={styles.buttonText}>{busy ? 'Aguarde…' : 'Entrar'}</Text></Pressable>
    </View>}
  </ScrollView></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ screen: { padding: 20, paddingBottom: 40 }, heading: { fontSize: 25, color: '#10243e', fontWeight: '700', marginBottom: 16 }, card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#dce4f3' }, text: { color: '#52647b', marginBottom: 16 }, label: { fontWeight: '600', marginBottom: 8, color: '#10243e' }, input: { borderWidth: 1, borderColor: '#dce4f3', borderRadius: 12, minHeight: 48, padding: 12, marginBottom: 16, fontSize: 16 }, button: { backgroundColor: '#0036cc', borderRadius: 12, padding: 14, minHeight: 48 }, buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' }, link: { color: '#0036cc', paddingVertical: 14 }, linkButton: { minHeight: 48 }, error: { color: '#9c1230', marginBottom: 16 } });
