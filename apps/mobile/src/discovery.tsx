// Vox Discovery look from the PWA (apps/web/src/assistant.css): deep-blue canvas, frosted panel, yellow actions.
import { useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { brandIcon, font, useCartCount } from './ui';

export const D = { yellow: '#ffdb5a', yellowInk: '#153467', soft: '#c2d4ff', faint: 'rgba(255,255,255,0.07)', line: 'rgba(255,255,255,0.27)' };

const icons = {
  balance: require('../assets/brand/discovery-icons/balance.webp'), battery: require('../assets/brand/discovery-icons/battery.webp'),
  connect: require('../assets/brand/discovery-icons/connect.webp'), create: require('../assets/brand/discovery-icons/create.webp'),
  discover: require('../assets/brand/discovery-icons/discover.webp'), learn: require('../assets/brand/discovery-icons/learn.webp'),
  play: require('../assets/brand/discovery-icons/play.webp'), save: require('../assets/brand/discovery-icons/save.webp'),
  social: require('../assets/brand/discovery-icons/social.webp'), storage: require('../assets/brand/discovery-icons/storage.webp'),
  work: require('../assets/brand/discovery-icons/work.webp'),
};
const vibeIcons: Record<string, keyof typeof icons> = { 'dia-a-dia': 'connect', fotos: 'create', jogos: 'play', trabalho: 'work', estudos: 'learn', 'redes-sociais': 'social', 'nao-sei': 'discover', equilibrado: 'balance', economia: 'save', bateria: 'battery', armazenamento: 'storage' };
export const vibeImage = (value: string) => icons[vibeIcons[value] || 'discover'];

/** Gentle vertical float used by the 3D artwork (disabled with reduced motion). */
export function useFloat(distance = 9, duration = 5000) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then(still => {
      if (still) return;
      loop = Animated.loop(Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));
      loop.start();
    }).catch(() => {});
    return () => loop?.stop();
  }, [value, duration]);
  return value.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] });
}

export function DiscoveryShell({ children, savedLink = true }: { children: ReactNode; savedLink?: boolean }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const count = useCartCount();
  return <View style={{ flex: 1, backgroundColor: '#032c98' }}>
    <StatusBar style="light" />
    <LinearGradient colors={['#0042d9', '#032c98']} locations={[0, 0.75]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <RadialGradient id="violet" cx="100%" cy="15%" rx="80%" ry="45%"><Stop offset="0" stopColor="#7558ed" stopOpacity="1" /><Stop offset="1" stopColor="#7558ed" stopOpacity="0" /></RadialGradient>
        <RadialGradient id="cyan" cx="18%" cy="38%" rx="55%" ry="30%"><Stop offset="0" stopColor="#6be5ff" stopOpacity="0.19" /><Stop offset="1" stopColor="#6be5ff" stopOpacity="0" /></RadialGradient>
        <RadialGradient id="pink" cx="85%" cy="65%" rx="55%" ry="30%"><Stop offset="0" stopColor="#dd9aff" stopOpacity="0.16" /><Stop offset="1" stopColor="#dd9aff" stopOpacity="0" /></RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#violet)" /><Rect width="100%" height="100%" fill="url(#cyan)" /><Rect width="100%" height="100%" fill="url(#pink)" />
    </Svg>
    <View pointerEvents="none" style={[st.glass, { top: insets.top + 64, bottom: Math.max(10, insets.bottom) }]} />
    <View style={[st.header, { paddingTop: insets.top + 12 }]}>
      <Pressable accessibilityRole="link" accessibilityLabel="Voltar à loja Vox" onPress={() => router.canGoBack() ? router.back() : router.replace('/loja')} style={st.brand}>
        <Image source={brandIcon} style={st.logo} /><Text style={[{ color: '#fff', fontSize: 21 }, font(700)]}>vox <Text style={[{ color: '#b9d3ff', fontSize: 13 }, font(500)]}>discovery</Text></Text>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        {savedLink && <Pressable accessibilityRole="link" accessibilityLabel="Minhas descobertas" onPress={() => router.push('/descobertas')} style={st.saved}><Text style={{ color: '#e1f4ff', fontSize: 22 }}>✦</Text></Pressable>}
        <Pressable accessibilityRole="button" onPress={() => router.push('/carrinho')} style={st.cart}><Text style={[{ color: '#fff', fontSize: 12 }, font(600)]}>Carrinho ({count})</Text></Pressable>
      </View>
    </View>
    <View style={{ flex: 1, paddingBottom: Math.max(18, insets.bottom) }}>{children}</View>
  </View>;
}

export function YellowButton({ label, onPress, disabled, trailing = '↗', style }: { label: string; onPress: () => void; disabled?: boolean; trailing?: string; style?: ViewStyle }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [st.next, pressed && { transform: [{ translateY: 3 }], borderBottomWidth: 2 }, disabled && { opacity: 0.6 }, style]}>
    <LinearGradient colors={['#ffe57b', '#ffcf42']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
    <Text style={[{ color: '#19366c', fontSize: 15, flex: 1, textAlign: 'center' }, font(700)]}>{label}</Text>{trailing ? <Text style={[{ color: '#19366c', fontSize: 15, position: 'absolute', right: 20 }, font(700)]}>{trailing}</Text> : null}
  </Pressable>;
}

// Discoveries waiting to be saved to favorites, like the PWA's session queue (30 minutes).
const KEY = 'vox.pending.discoveries.v1';
export type Pending = { lojaId: string; ids: string[]; createdAt: number };
export async function queueDiscoveries(rows: { produto: { id: string; lojaId: string } }[]) {
  const lojaId = rows[0]?.produto.lojaId;
  const ids = [...new Set(rows.filter(row => row.produto.lojaId === lojaId).map(row => row.produto.id))].slice(0, 3);
  if (!lojaId || !ids.length) throw new Error('Encontre um aparelho antes de finalizar.');
  await AsyncStorage.setItem(KEY, JSON.stringify({ lojaId, ids, createdAt: Date.now() }));
}
export async function readDiscoveries(): Promise<Pending | null> {
  try {
    const value = JSON.parse((await AsyncStorage.getItem(KEY)) || 'null') as Pending | null;
    if (!value || typeof value.lojaId !== 'string' || !Array.isArray(value.ids) || !value.ids.length || value.ids.length > 3 || value.ids.some(id => typeof id !== 'string') || !Number.isFinite(value.createdAt) || Date.now() - value.createdAt > 30 * 60 * 1000 || value.createdAt > Date.now()) return null;
    return value;
  } catch { return null; }
}
export async function updateDiscoveries(value: Pending | null) {
  if (!value?.ids.length) await AsyncStorage.removeItem(KEY); else await AsyncStorage.setItem(KEY, JSON.stringify(value));
}

const st = StyleSheet.create({
  glass: { position: 'absolute', left: 12, right: 12, borderRadius: 34, borderWidth: 1, borderColor: 'rgba(228,242,255,0.13)', backgroundColor: 'rgba(255,255,255,0.05)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 6 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 44 },
  logo: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#fff', resizeMode: 'contain' },
  saved: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.19)', backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  cart: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.21)', backgroundColor: 'rgba(255,255,255,0.09)' },
  next: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 16, paddingHorizontal: 24, overflow: 'hidden', borderBottomWidth: 5, borderBottomColor: '#d4a52a' },
});
