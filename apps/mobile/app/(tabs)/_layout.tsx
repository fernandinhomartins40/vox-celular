import { Tabs } from 'expo-router';
import AppTabs from '../../src/AppTabs';
import { PanelHeader, P } from '../../src/panel';
import { C } from '../../src/ui';

// Customer-area pages keep the bottom bar, as in the PWA; their header is the panel top bar.
const account = ['pedidos', 'favoritos', 'servicos', 'beneficios', 'avisos', 'privacidade', 'senha', 'acessos'];
const panel = { headerShown: true, header: () => <PanelHeader />, sceneStyle: { backgroundColor: P.paper } };

export default function MainTabs() {
  return <Tabs backBehavior="history" tabBar={props => <AppTabs {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
    <Tabs.Screen name="index" options={{ title: 'Início' }} />
    <Tabs.Screen name="loja" options={{ title: 'Loja' }} />
    <Tabs.Screen name="ajuda" options={{ title: 'Ajuda' }} />
    <Tabs.Screen name="conta" options={{ title: 'Conta' }} />
    {account.map(name => <Tabs.Screen key={name} name={name} options={panel} />)}
  </Tabs>;
}
