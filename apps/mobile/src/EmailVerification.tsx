import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { requestForSession, sessionRevision } from './api';
export default function EmailVerification() {
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const active = useRef(false), running = useRef(false);
  useFocusEffect(useCallback(() => { active.current = true; if (!running.current) setBusy(false); return () => { active.current = false; }; }, []));
  async function submit() {
    if (running.current) return;
    const revision = sessionRevision();
    running.current = true; setBusy(true); setNotice(''); setError('');
    try {
      await requestForSession(revision, '/auth/email/solicitar', {});
      if (active.current && sessionRevision() === revision) setNotice('Se necessário, um link poderá ser enviado ao e-mail da sua conta. Confira também o spam e abra o link no navegador.');
    } catch (e) { if (active.current && sessionRevision() === revision) setError(e instanceof Error ? e.message : 'Não foi possível solicitar. Tente novamente.'); }
    finally { running.current = false; if (active.current) setBusy(false); }
  }
  return <View style={styles.container}><Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || Boolean(notice), busy }} disabled={busy || Boolean(notice)} onPress={submit} style={[styles.button, (busy || Boolean(notice)) && { opacity: 0.5 }]}><Text style={styles.buttonText}>{busy ? 'Aguarde…' : 'Solicitar confirmação do e-mail'}</Text></Pressable>{notice && <Text accessibilityLiveRegion="polite" style={styles.text}>{notice}</Text>}{error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}</View>;
}
const styles = StyleSheet.create({ container: { marginVertical: 16, gap: 12 }, button: { minHeight: 48, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#dce4f3', backgroundColor: '#f3f6ff' }, buttonText: { color: '#0036cc', fontWeight: '600', textAlign: 'center' }, text: { color: '#52647b', lineHeight: 22 }, error: { color: '#9c1230', lineHeight: 22 } });
