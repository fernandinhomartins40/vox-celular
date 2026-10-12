import { Tabs, Link } from 'expo-router';
import { Text } from 'react-native';
export default function MainTabs() {
  return <Tabs screenOptions={{ headerTintColor: '#0036cc', headerStyle: { backgroundColor: '#fff' }, sceneStyle: { backgroundColor: '#f4f6fc' }, tabBarActiveTintColor: '#0036cc', tabBarInactiveTintColor: '#52647b', tabBarLabelStyle: { fontSize: 12, fontWeight: '600' }, tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#dce4f3' }, headerRight: () => <Link href="/carrinho" style={{ color: '#0036cc', padding: 14, minHeight: 48 }}>Carrinho</Link> }}>
    <Tabs.Screen name="index" options={{ title: 'Vox Celular', tabBarLabel: 'Início', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }} accessibilityElementsHidden>⌂</Text> }} />
    <Tabs.Screen name="loja" options={{ title: 'Loja', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }} accessibilityElementsHidden>▦</Text> }} />
    <Tabs.Screen name="assistente" options={{ title: 'Assistente', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }} accessibilityElementsHidden>✦</Text> }} />
    <Tabs.Screen name="ajuda" options={{ title: 'Ajuda', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }} accessibilityElementsHidden>?</Text> }} />
    <Tabs.Screen name="conta" options={{ title: 'Minha conta', tabBarLabel: 'Conta', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }} accessibilityElementsHidden>○</Text> }} />
  </Tabs>;
}
