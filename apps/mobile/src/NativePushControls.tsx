import { useCallback, useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { requestForSession, sessionRevision } from './api';
import { registerNativePush } from './nativePush';

type Device = { id: string; canal: string; ativo: boolean; createdAt: string };
export default function NativePushControls({ consent, unsaved }: { consent: boolean; unsaved: boolean }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const revision = useRef(-1), operation = useRef<symbol | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    revision.current = sessionRevision(); operation.current = null;
    setDevices([]); setBusy(false); setMessage('');
    requestForSession<Device[]>(revision.current, '/push/native').then(rows => { if (active) setDevices(rows); }).catch(() => { if (active) setMessage('Não foi possível consultar os aparelhos cadastrados.'); });
    return () => { active = false; revision.current = -1; operation.current = null; };
  }, []));
  async function run(id?: string) {
    if (operation.current || revision.current !== sessionRevision()) return;
    const version = revision.current, token = Symbol(); operation.current = token;
    const active = () => operation.current === token && revision.current === version && sessionRevision() === version;
    setBusy(true); setMessage('');
    try {
      if (id) await requestForSession(version, `/push/native/${encodeURIComponent(id)}`, undefined, 'DELETE');
      else await registerNativePush(version, active);
      const rows = await requestForSession<Device[]>(version, '/push/native');
      if (active()) { setDevices(rows); setMessage(id ? 'Aparelho removido.' : 'Aparelho cadastrado. Consulte Meus avisos para acompanhar as atualizações; o cadastro não confirma entrega de push.'); }
    } catch (e) { if (active()) setMessage(e instanceof Error ? e.message : 'Não foi possível atualizar. Tente novamente.'); }
    finally { if (active()) { operation.current = null; setBusy(false); } }
  }
  const action = (label: string, onPress: () => void, disabled = busy) => <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={{ minHeight: 48, paddingVertical: 14, opacity: disabled ? 0.5 : 1 }}><Text style={{ color: '#0036cc', fontWeight: '600' }}>{label}</Text></Pressable>;
  return <View style={{ marginTop: 16, padding: 20, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce4f3' }}>
    <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: '700', color: '#10243e', marginBottom: 12 }}>Notificações no aparelho</Text>
    <Text style={{ color: '#52647b', lineHeight: 22 }}>Salve sua preferência e autorize este aparelho. Você pode remover os acessos quando quiser.</Text>
    {action(busy ? 'Aguarde…' : 'Cadastrar este aparelho', () => { void run(); }, busy || !consent || unsaved)}
    {unsaved && <Text style={{ color: '#52647b' }}>Salve suas preferências antes de cadastrar.</Text>}
    {action('Abrir permissões do aparelho', () => { void Linking.openSettings().catch(() => setMessage('Abra as configurações do aparelho para alterar a permissão.')); })}
    {devices.map((device, index) => <View key={device.id} style={{ borderTopWidth: 1, borderColor: '#dce4f3', marginTop: 8, paddingTop: 12 }}><Text style={{ color: '#10243e' }}>{device.canal === 'EXPO_IOS' ? 'iPhone/iPad' : 'Android'} · {device.ativo ? 'Cadastrado' : 'Desativado'}</Text><Text style={{ color: '#52647b' }}>{new Date(device.createdAt).toLocaleDateString('pt-BR')}</Text>{action(`Remover aparelho ${index + 1}`, () => { void run(device.id); })}</View>)}
    {message && <Text accessibilityLiveRegion="polite" style={{ color: '#52647b', lineHeight: 22 }}>{message}</Text>}
  </View>;
}
