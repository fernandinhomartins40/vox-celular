import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
export default function Layout() {
  return <SafeAreaProvider><Stack screenOptions={{ headerTintColor: '#0036cc', headerStyle: { backgroundColor: '#fff' }, contentStyle: { backgroundColor: '#f4f6fc' } }}><Stack.Screen name="index" options={{ title: 'Vox Celular' }} /><Stack.Screen name="conta" options={{ title: 'Minha conta' }} /><Stack.Screen name="pedidos" options={{ title: 'Meus pedidos' }} /><Stack.Screen name="favoritos" options={{ title: 'Meus favoritos' }} /><Stack.Screen name="ajuda" options={{ title: 'Ajuda das operadoras' }} /><Stack.Screen name="privacidade" options={{ title: 'Privacidade' }} /></Stack></SafeAreaProvider>;
}
