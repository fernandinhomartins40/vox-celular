// Visual tokens and shared pieces copied from the PWA customer app (apps/web/src/customer-app.css).
import { useCallback, useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './icons';
import { readCart } from './cart';

export const C = {
  bg: '#f5f7fc', text: '#15243c', ink: '#10243e', muted: '#66748a', muted2: '#758198', blue: '#003acb', royal: '#0825A3',
  blueSoft: '#edf2ff', tabActive: '#eef3ff', line: '#e9edf6', line2: '#e2e8f3', white: '#ffffff', red: '#E4002B',
  yellow: '#ffdb5a', yellowLine: '#ffe88d', yellowInk: '#14346c', yellowShadow: '#cf9f20', paper: '#f8f9fc', green: '#059669',
};
export const font = (weight: 400 | 500 | 600 | 700 = 400): TextStyle => ({
  fontFamily: { 400: 'DMSans_400Regular', 500: 'DMSans_500Medium', 600: 'DMSans_600SemiBold', 700: 'DMSans_700Bold' }[weight],
});
/** Barlow Condensed, the PWA display face (.font-display). */
export const display = (weight: 600 | 700 | 800 = 700): TextStyle => ({ fontFamily: { 600: 'BarlowCondensed_600SemiBold', 700: 'BarlowCondensed_700Bold', 800: 'BarlowCondensed_800ExtraBold' }[weight] });
export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
export const brandIcon = require('../assets/brand/icon-192.png');

export function useCartCount() {
  const [count, setCount] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    readCart().then(cart => { if (active) setCount(cart.items.reduce((sum, item) => sum + item.qty, 0)); }).catch(() => {});
    return () => { active = false; };
  }, []));
  return count;
}

/** Sticky app header: brand on the left, cart with item count on the right (PWA .customer-app-header). */
export function AppHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const count = useCartCount();
  return <View style={[s.header, { paddingTop: Math.max(12, insets.top) }]}>
    <Pressable accessibilityRole="link" accessibilityLabel="Início do aplicativo" onPress={() => router.navigate('/')} style={s.brand}>
      <Image source={brandIcon} style={s.brandImg} accessibilityIgnoresInvertColors /><Text style={[s.brandText, font(700)]}>Vox Celular</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir carrinho, ${count} itens`} onPress={() => router.push('/carrinho')} style={s.cart}>
      <Icon.cart size={22} color={C.blue} /><Text style={[{ color: C.blue, fontSize: 15 }, font(700)]}>{count}</Text>
    </Pressable>
  </View>;
}

export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={{ marginBottom: 22 }}><Text accessibilityRole="header" style={[s.h1, font(700)]}>{title}</Text>{subtitle ? <Text style={[s.sub, font()]}>{subtitle}</Text> : null}</View>;
}

export function Message({ children, action, onAction, tone }: { children: ReactNode; action?: string; onAction?: () => void; tone?: 'error' }) {
  return <View accessibilityLiveRegion="polite" style={s.message}><Text accessibilityRole={tone === 'error' ? 'alert' : undefined} style={[{ fontSize: 14, color: C.muted, lineHeight: 21 }, font()]}>{children}</Text>
    {action && onAction ? <Pressable accessibilityRole="button" onPress={onAction} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[{ color: C.blue, fontSize: 14 }, font()]}>{action}</Text></Pressable> : null}</View>;
}

export function PrimaryButton({ label, onPress, disabled, icon }: { label: string; onPress: () => void; disabled?: boolean; icon?: ReactNode }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [s.primary, (disabled || pressed) && { opacity: disabled ? 0.55 : 0.85 }]}>
    {icon}<Text style={[{ color: C.white, fontSize: 15 }, font(700)]}>{label}</Text></Pressable>;
}

export const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bg, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  brandImg: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.white, resizeMode: 'contain' },
  brandText: { color: C.ink, fontSize: 17 },
  cart: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, minWidth: 44, padding: 10, borderRadius: 14, backgroundColor: C.white },
  h1: { color: C.text, fontSize: 28, letterSpacing: -0.6 },
  sub: { marginTop: 6, fontSize: 14, color: C.muted },
  message: { padding: 16, backgroundColor: C.white, borderWidth: 1, borderColor: '#e5eaf4', borderRadius: 16, marginVertical: 12 },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 14, backgroundColor: C.royal, paddingHorizontal: 18 },
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 20 },
});
