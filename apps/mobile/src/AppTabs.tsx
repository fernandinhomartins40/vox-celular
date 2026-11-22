// Bottom navigation from the PWA (.customer-app-tabs) with the raised glass assistant button in the centre.
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
type BottomTabBarProps = { state: { index: number; routes: { name: string }[] }; navigation: { navigate: (name: string) => void } };
import { Icon } from './icons';
import { C, font } from './ui';

const tabs = [['index', 'Início', Icon.home], ['loja', 'Loja', Icon.package], ['assistente', 'Assistente', null], ['ajuda', 'Ajuda', Icon.headphones], ['conta', 'Conta', Icon.user]] as const;

function AssistantGlass() {
  const spin = useRef(new Animated.Value(0)).current;
  const [still, setStill] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => {}); }, []);
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [still, spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <View style={st.glassWrap}>
    <View style={st.ring}><Animated.View style={[st.ringSpin, { transform: [{ rotate }] }]}><LinearGradient colors={['#80eaff', '#c8b9ff', '#ffffff', '#386aff', '#80eaff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /></Animated.View></View>
    <LinearGradient colors={['#6687ff', '#003acb', '#533cd5']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.glass}>
      <LinearGradient colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0)']} locations={[0, 0.45, 0.46]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.shine} />
      <Text style={st.spark}>✦</Text>
    </LinearGradient>
  </View>;
}

export default function AppTabs({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const name = state.routes[state.index]?.name;
  // Customer-area pages belong to the account tab, like /area-cliente/* in the PWA.
  const current = ['pedidos', 'favoritos', 'servicos', 'beneficios', 'avisos', 'privacidade', 'senha', 'acessos'].includes(name) ? 'conta' : name;
  return <View style={[st.bar, { paddingBottom: 8 + insets.bottom }]} accessibilityRole="tablist">
    {tabs.map(([name, label, I]) => {
      const selected = current === name;
      if (!I) return <Pressable key={name} accessibilityRole="button" accessibilityLabel="Assistente" onPress={() => router.push('/assistente')} style={st.tab}>
        <AssistantGlass /><Text style={[st.label, font(700), { color: C.blue }]}>{label}</Text>
      </Pressable>;
      return <Pressable key={name} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => { if (name !== state.routes[state.index]?.name) navigation.navigate(name); }} style={[st.tab, selected && st.tabOn]}>
        <I size={23} color={selected ? C.blue : C.muted2} /><Text style={[st.label, font(600), { color: selected ? C.blue : C.muted2 }]}>{label}</Text>
      </Pressable>;
    })}
  </View>;
}

const st = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.98)', borderTopWidth: 1, borderTopColor: '#e4e9f3', paddingTop: 8, paddingHorizontal: 8, shadowColor: '#10243e', shadowOpacity: 0.05, shadowRadius: 15, shadowOffset: { width: 0, height: -8 }, elevation: 12 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 52, borderRadius: 14 },
  tabOn: { backgroundColor: C.tabActive },
  label: { fontSize: 11 },
  glassWrap: { width: 62, height: 62, marginTop: -30, marginBottom: -2, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 62, height: 62, borderRadius: 22, overflow: 'hidden', shadowColor: '#5d9fff', shadowOpacity: 0.4, shadowRadius: 10 },
  ringSpin: { position: 'absolute', left: -20, top: -20, right: -20, bottom: -20 },
  glass: { width: 56, height: 56, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#003acb', shadowOpacity: 0.3, shadowRadius: 11, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  shine: { position: 'absolute', top: 2, left: 2, right: 2, bottom: 2, borderRadius: 16 },
  spark: { color: C.white, fontSize: 34, lineHeight: 38, textShadowColor: 'rgba(255,255,255,0.47)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 2 } },
});
