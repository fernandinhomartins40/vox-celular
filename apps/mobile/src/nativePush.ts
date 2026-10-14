import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { requestForSession, sessionRevision, rememberNativePushDevice } from './api';

export async function registerNativePush(revision: number, active: () => boolean) {
  const check = () => { if (!active() || sessionRevision() !== revision) throw new Error('Sua conta mudou. Abra novamente as preferências.'); };
  check();
  const preferences = await requestForSession<{ notificacoes: boolean }>(revision, '/privacidade/preferencias');
  check();
  if (!preferences.notificacoes) throw new Error('Salve a autorização para receber notificações primeiro.');
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? process.env.EXPO_PUBLIC_EXPO_PROJECT_ID;
  if (typeof projectId !== 'string' || !/^[a-f0-9-]{36}$/i.test(projectId) || !['android', 'ios'].includes(Platform.OS)) throw new Error('As notificações ainda não estão disponíveis nesta versão. Consulte Meus avisos.');
  let token: string;
  try {
    if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('vox-updates', { name: 'Pedidos e atendimentos', importance: Notifications.AndroidImportance.DEFAULT, lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE });
    check();
    let permission = await Notifications.getPermissionsAsync();
    check();
    if (!permission.granted && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
    check();
    const allowed = permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!allowed) throw new Error('PERMISSION_DENIED');
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (error) {
    check();
    if (error instanceof Error && error.message === 'PERMISSION_DENIED') throw new Error('Notificações não autorizadas. Você pode mudar essa escolha nas permissões do aparelho.');
    throw new Error('Não foi possível preparar as notificações. Tente novamente com conexão.');
  }
  check();
  const device = await requestForSession<{ id: string; ativo: boolean; canal: string }>(revision, '/push/native', { token, plataforma: Platform.OS }, 'PUT');
  check();
  await rememberNativePushDevice(device.id, revision);
  return device;
}
