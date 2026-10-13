import { useCallback, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { hasSavedSession, logout, NativeUser, request, saveSession, Session } from '../../src/api';

export default function Account() {
  const [user, setUser] = useState<NativeUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true; setUser(null); setBusy(true); setError('');
    (async () => {
      try { if (await hasSavedSession()) { const profile = await request<NativeUser>('/auth/me', undefined, true); if (active) setUser(profile); } }
      catch (e) { if (active) setError(e instanceof Error ? e.message : 'Não foi possível recuperar a sessão.'); }
      finally { if (active) setBusy(false); }
    })();
    return () => { active = false; };
  }, []));
  async function login() {
    setBusy(true); setError('');
    try {
      if (!email.trim() || !password) throw new Error('Informe seu e-mail e sua senha.');
      if (creating && (name.trim().length < 2 || password.length < 12 || password.length > 72 || confirmation !== password)) throw new Error('Informe seu nome, use uma senha de 12 a 72 caracteres e confirme a mesma senha.');
      const store = await request<{ id: string }>('/loja');
      const session = await request<Session>(creating ? '/auth/register' : '/auth/login', { email: email.trim(), senha: password, lojaId: store.id, plataforma: 'native', ...(creating ? { nome: name.trim(), telefone: phone.trim() } : {}) });
      await saveSession(session);
      if (session.user.role !== 'CLIENTE') { await logout(); throw new Error('Este aplicativo é para clientes. Use o painel web para administrar a loja.'); }
      setUser(session.user); setPassword(''); setConfirmation(''); setName(''); setPhone(''); setCreating(false);
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
    {user ? <View style={styles.card}><Text style={styles.heading}>{user.nome}</Text><Text style={styles.text}>{user.email}</Text><Link href="/avisos" style={styles.link}>Meus avisos</Link><Link href="/beneficios" style={styles.link}>Meus pontos e recompensas</Link><Link href="/pedidos" style={styles.link}>Consultar meus pedidos</Link><Link href="/servicos" style={styles.link}>Serviços e atendimentos</Link><Link href="/favoritos" style={styles.link}>Meus favoritos e comparação</Link><Link href="/privacidade" style={styles.link}>Privacidade e preferências</Link><Link href="/senha" style={styles.link}>Alterar minha senha</Link><Link href="/acessos" style={styles.link}>Acessos da minha conta</Link><Pressable accessibilityRole="button" disabled={busy} onPress={exit} style={styles.button}><Text style={styles.buttonText}>Sair da conta</Text></Pressable></View> : <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.heading}>{creating ? 'Criar minha conta' : 'Entrar na Vox'}</Text>
      <Text style={styles.text}>{creating ? 'Cadastre-se para acompanhar compras e atendimentos. As preferências de personalização e notificações começam desativadas.' : 'Use sua conta de cliente da Vox.'}</Text>
      {creating && <><Text style={styles.label}>Seu nome</Text><TextInput accessibilityLabel="Seu nome" autoComplete="name" value={name} onChangeText={setName} maxLength={100} style={styles.input} editable={!busy} /><Text style={styles.label}>Telefone (opcional)</Text><TextInput accessibilityLabel="Telefone opcional" autoComplete="tel" keyboardType="phone-pad" value={phone} onChangeText={setPhone} maxLength={30} style={styles.input} editable={!busy} /></>}
      <Text nativeID="emailLabel" style={styles.label}>E-mail</Text><TextInput accessibilityLabel="E-mail" autoComplete="email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} maxLength={254} style={styles.input} editable={!busy} />
      <Text style={styles.label}>Senha</Text><TextInput accessibilityLabel="Senha" autoComplete={creating ? 'new-password' : 'current-password'} secureTextEntry={!showPassword} value={password} onChangeText={setPassword} style={styles.input} editable={!busy} maxLength={creating ? 72 : undefined} onSubmitEditing={creating ? undefined : login} />
      {creating && <><Text style={styles.text}>Use de 12 a 72 caracteres.</Text><Text style={styles.label}>Confirme sua senha</Text><TextInput accessibilityLabel="Confirme sua senha" autoComplete="new-password" secureTextEntry={!showPassword} value={confirmation} onChangeText={setConfirmation} maxLength={72} style={styles.input} editable={!busy} onSubmitEditing={login} /></>}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showPassword }} disabled={busy} onPress={() => setShowPassword(value => !value)} style={styles.linkButton}><Text style={styles.link}>{showPassword ? 'Ocultar senha' : 'Mostrar senha'}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={login} style={[styles.button, busy && { opacity: 0.5 }]}><Text style={styles.buttonText}>{busy ? 'Aguarde…' : creating ? 'Criar conta' : 'Entrar'}</Text></Pressable>
      {!creating && <Link href="/recuperar-senha" accessibilityState={{ disabled: busy }} onPress={event => { if (busy) { event.preventDefault(); return; } setPassword(''); setConfirmation(''); }} style={styles.link}>Esqueci minha senha</Link>}
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setCreating(value => !value); setPassword(''); setConfirmation(''); setError(''); }} style={styles.linkButton}><Text style={styles.link}>{creating ? 'Já tenho conta · Entrar' : 'Sou novo · Criar conta'}</Text></Pressable>
    </View>}
  </ScrollView></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ screen: { padding: 20, paddingBottom: 40 }, heading: { fontSize: 25, color: '#10243e', fontWeight: '700', marginBottom: 16 }, card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#dce4f3' }, text: { color: '#52647b', marginBottom: 16 }, label: { fontWeight: '600', marginBottom: 8, color: '#10243e' }, input: { borderWidth: 1, borderColor: '#dce4f3', borderRadius: 12, minHeight: 48, padding: 12, marginBottom: 16, fontSize: 16 }, button: { backgroundColor: '#0036cc', borderRadius: 12, padding: 14, minHeight: 48 }, buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' }, link: { color: '#0036cc', paddingVertical: 14 }, linkButton: { minHeight: 48 }, error: { color: '#9c1230', marginBottom: 16 } });
