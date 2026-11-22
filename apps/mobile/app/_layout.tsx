import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed';
import NotificationNavigation from '../src/NotificationNavigation';
import { C } from '../src/ui';
import { P } from '../src/panel';
export default function Layout() {
  const [loaded, failed] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, BarlowCondensed_800ExtraBold });
  // Fonts are bundled with the app, so this only waits a frame; on failure the system font is used.
  if (!loaded && !failed) return null;
  return <SafeAreaProvider><StatusBar style="dark" /><Stack screenOptions={{ headerTintColor: C.blue, headerStyle: { backgroundColor: C.bg }, headerShadowVisible: false, headerTitleStyle: { fontFamily: 'DMSans_700Bold', color: C.ink }, contentStyle: { backgroundColor: P.paper } }}><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="assistente" options={{ headerShown: false }} /><Stack.Screen name="descobertas" options={{ headerShown: false }} /><Stack.Screen name="novidades" options={{ headerShown: false }} /><Stack.Screen name="produto" options={{ headerShown: false, presentation: 'modal' }} /><Stack.Screen name="carrinho" options={{ headerShown: false, presentation: 'modal' }} /></Stack><NotificationNavigation /></SafeAreaProvider>;
}
