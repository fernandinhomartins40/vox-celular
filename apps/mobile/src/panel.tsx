// Customer area look from the PWA panel (apps/web/src/components/panel/panel.css + PanelShell.jsx).
import { useState, type ReactNode } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useRouter, usePathname, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './icons';
import { font } from './ui';

export const P = { paper: '#f4f6fb', line: '#dce3ef', ink: '#14213d', muted: '#66758b', body: '#4a5870', royal: '#0825A3', royal50: '#EBF0FF', royal400: '#3D6BFF', red: '#E4002B' };

const menu: [Href, string, keyof typeof Icon][] = [['/conta', 'Início', 'home'], ['/pedidos', 'Meus pedidos', 'package'], ['/favoritos', 'Meus favoritos', 'star'], ['/beneficios', 'Meus benefícios', 'gift'], ['/avisos', 'Meus avisos', 'package'], ['/privacidade', 'Minha conta', 'user'], ['/servicos', 'Meus serviços', 'package']];

type Who = { user?: { nome: string; email: string } | null; onLogout?: () => void };
/** Top bar with the side menu, "Área do cliente" and "Ver loja" (PWA .panel-topbar); also used as the stack header. */
export function PanelHeader({ user, onLogout }: Who) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const go = (to: Href) => { setOpen(false); router.navigate(to); };
  return <>
    <View style={[st.topbar, { paddingTop: insets.top, height: 68 + insets.top }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir menu" accessibilityState={{ expanded: open }} onPress={() => setOpen(true)} style={st.menuButton}><Icon.menu size={20} color={P.ink} /></Pressable>
      <Text style={[{ flex: 1, fontSize: 14, color: P.ink }, font(700)]}>Área do cliente</Text>
      <Pressable accessibilityRole="link" onPress={() => router.navigate('/loja')} style={st.storeLink}><Text style={[{ color: P.royal, fontSize: 14 }, font(600)]}>Ver loja</Text><Icon.arrowUpRight size={20} color={P.royal} /></Pressable>
    </View>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View accessibilityViewIsModal style={[st.drawer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={st.brand}><Image source={require('../assets/brand/vox-logo.png')} accessibilityLabel="VOX Celular" style={{ width: 64, height: 48 }} resizeMode="contain" /><Text style={[{ fontSize: 12, color: P.muted }, font()]}>Área do cliente</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar menu" onPress={() => setOpen(false)} style={{ marginLeft: 'auto', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Icon.close size={20} color={P.ink} /></Pressable></View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
            <Text style={[{ fontSize: 11, letterSpacing: 1, color: P.muted, marginHorizontal: 12, marginVertical: 8 }, font(700)]}>SUA CONTA</Text>
            {menu.map(([to, label, icon]) => { const I = Icon[icon]; const on = pathname === to; return <Pressable key={label} accessibilityRole="link" accessibilityState={{ selected: on }} onPress={() => go(to)} style={[st.navLink, on && st.navOn]}><I size={20} color={on ? P.royal : P.body} /><Text style={[{ fontSize: 14, color: on ? P.royal : P.body }, font(on ? 700 : 500)]}>{label}</Text></Pressable>; })}
          </ScrollView>
          <View style={{ borderTopWidth: 1, borderTopColor: P.line, padding: 12 }}>
            <Pressable accessibilityRole="link" onPress={() => go('/')} style={st.navLink}><Icon.arrowRight size={20} color={P.body} /><Text style={[{ fontSize: 14, color: P.body }, font(500)]}>Ir para a loja</Text></Pressable>
            {user ? <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12 }}><View style={st.avatar}><Text style={[{ color: P.royal }, font(700)]}>{user.nome?.[0] || 'V'}</Text></View><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={[{ color: P.ink }, font(700)]}>{user.nome}</Text><Text numberOfLines={1} style={[{ color: P.muted, fontSize: 12 }, font()]}>{user.email}</Text></View></View> : null}
            {onLogout ? <Pressable accessibilityRole="button" onPress={() => { setOpen(false); onLogout(); }} style={st.navLink}><Icon.logOut size={20} color={P.body} /><Text style={[{ fontSize: 14, color: P.body }, font(500)]}>Sair da conta</Text></Pressable> : null}
          </View>
        </View>
        <Pressable accessibilityLabel="Fechar menu" onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' }} />
      </View>
    </Modal>
  </>;
}

/** Customer-area page: panel header plus a scrolling body. */
export function PanelScreen({ children, onLogout, user }: Who & { children: ReactNode }) {
  return <View style={{ flex: 1, backgroundColor: P.paper }}>
    <PanelHeader user={user} onLogout={onLogout} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: 24, paddingHorizontal: 16, paddingBottom: 32 }}>{children}</ScrollView>
  </View>;
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return <View style={{ marginBottom: 28, gap: 16 }}><View><Text accessibilityRole="header" style={[st.h1, font(700)]}>{title}</Text>{description ? <Text style={[{ color: P.muted, fontSize: 14, lineHeight: 21, marginTop: 8 }, font()]}>{description}</Text> : null}</View>{children}</View>;
}

export function HelpLink({ label, icon, onPress }: { label: string; icon?: ReactNode; onPress: () => void }) {
  return <Pressable accessibilityRole="link" onPress={onPress} style={st.helpLink}>{icon}<Text style={[{ color: P.royal, fontSize: 14 }, font(600)]}>{label}</Text></Pressable>;
}

export function PanelButton({ label, onPress, disabled, secondary, icon, style }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; icon?: ReactNode; style?: ViewStyle }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [st.button, secondary ? st.secondary : st.primary, (pressed || disabled) && { opacity: disabled ? 0.55 : 0.85 }, style]}>
    <Text style={[{ color: secondary ? P.royal : '#fff', fontSize: 14, textAlign: 'center' }, font(600)]}>{label}</Text>{icon}
  </Pressable>;
}

export function NextAction({ title, description, action, onPress }: { title: string; description: string; action: string; onPress: () => void }) {
  return <View accessibilityLabel="Próximo passo" style={st.next}>
    <View style={{ flexDirection: 'row', gap: 16 }}><View style={st.actionIcon}><Icon.arrowRight size={20} color={P.royal} /></View>
      <View style={{ flex: 1 }}><Text style={[{ fontSize: 20, color: P.ink, marginBottom: 4 }, font(700)]}>{title}</Text><Text style={[{ color: P.body, fontSize: 14, lineHeight: 21 }, font()]}>{description}</Text></View></View>
    <PanelButton label={action} onPress={onPress} icon={<Icon.arrowRight size={20} color="#fff" />} style={{ alignSelf: 'flex-start', marginLeft: 56, marginTop: 16 }} />
  </View>;
}

export function QuickActions({ items }: { items: { label: string; description: string; icon: keyof typeof Icon; onPress: () => void }[] }) {
  return <View accessibilityLabel="Ações rápidas" style={{ gap: 8, marginBottom: 24 }}>{items.map(({ label, description, icon, onPress }) => { const I = Icon[icon]; return <Pressable key={label} accessibilityRole="link" onPress={onPress} style={st.quick}>
    <View style={st.actionIcon}><I size={20} color={P.royal} /></View>
    <View style={{ flex: 1, minWidth: 0 }}><Text style={[{ color: P.ink, fontSize: 14 }, font(700)]}>{label}</Text><Text style={[{ color: P.muted, fontSize: 12, marginTop: 3 }, font()]}>{description}</Text></View>
    <Icon.arrowRight size={20} color={P.ink} />
  </Pressable>; })}</View>;
}

export function Disclosure({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <View style={st.surfaceBox}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(v => !v)} style={{ paddingVertical: 16, paddingHorizontal: 20 }}>
      <Text style={[{ color: P.ink, fontSize: 14 }, font(700)]}>{open ? '▼' : '▶'}  {title}</Text>{subtitle ? <Text style={[{ color: P.muted, fontSize: 14, marginTop: 4, marginLeft: 18 }, font()]}>{subtitle}</Text> : null}
    </Pressable>
    {open ? <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>{children}</View> : null}
  </View>;
}

export function MetricCard({ label, value, description, icon, onPress }: { label: string; value: string | number; description: string; icon: keyof typeof Icon; onPress?: () => void }) {
  const I = Icon[icon];
  return <Pressable accessibilityRole={onPress ? 'link' : undefined} disabled={!onPress} onPress={onPress} style={st.metric}>
    <View style={[st.actionIcon, { alignSelf: 'flex-start', marginBottom: 16 }]}><I size={20} color={P.royal} /></View>
    <Text style={[{ fontSize: 24, letterSpacing: -1, color: P.ink, marginBottom: 4 }, font(700)]}>{value}</Text><Text style={[{ color: P.ink, fontSize: 14 }, font()]}>{label}</Text><Text style={[{ color: P.muted, fontSize: 13, marginTop: 4 }, font()]}>{description}</Text>
  </Pressable>;
}

export function Surface({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[st.surfaceBox, { padding: 18 }, style]}>{children}</View>;
}

export function Sections<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (value: T) => void }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>{options.map(([key, label]) => { const on = key === value; return <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(key)} style={[st.section, on && { backgroundColor: P.royal, borderColor: P.royal }]}><Text style={[{ fontSize: 14, color: on ? '#fff' : P.royal }, font(600)]}>{label}</Text></Pressable>; })}</View>;
}

export function Notice({ children, tone = 'warning', action, onAction }: { children: ReactNode; tone?: 'warning' | 'success' | 'error'; action?: string; onAction?: () => void }) {
  const colors = { warning: ['#fff8eb', '#784b0e', '#ead5ad'], success: ['#ecfdf5', '#166534', '#bbf7d0'], error: ['#fef2f2', '#991b1b', '#fecaca'] }[tone];
  return <View accessibilityRole={tone === 'error' ? 'alert' : undefined} accessibilityLiveRegion="polite" style={{ backgroundColor: colors[0], borderColor: colors[2], borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 16 }}>
    <Text style={[{ color: colors[1], fontSize: 14, lineHeight: 20 }, font()]}>{children}</Text>
    {action && onAction ? <Pressable accessibilityRole="button" onPress={onAction} style={{ minHeight: 36, justifyContent: 'center' }}><Text style={[{ color: colors[1], textDecorationLine: 'underline' }, font(600)]}>{action}</Text></Pressable> : null}
  </View>;
}

export function Feedback({ children }: { children: ReactNode }) {
  return <View accessibilityLiveRegion="polite" style={[st.surfaceBox, { alignItems: 'center', gap: 12, paddingVertical: 40, paddingHorizontal: 20 }]}><Text style={[{ color: P.body, fontSize: 14, textAlign: 'center' }, font()]}>{children}</Text></View>;
}

export const panelText = StyleSheet.create({
  h2: { fontSize: 20, color: P.ink, fontFamily: 'DMSans_700Bold' },
  body: { fontSize: 14, lineHeight: 21, color: P.body, fontFamily: 'DMSans_400Regular' },
  muted: { fontSize: 13, lineHeight: 19, color: P.muted, fontFamily: 'DMSans_400Regular' },
  label: { fontSize: 14, color: P.ink, fontFamily: 'DMSans_600SemiBold', marginBottom: 6 },
  link: { fontSize: 14, color: P.royal, fontFamily: 'DMSans_600SemiBold' },
});
export const panelInput = { borderWidth: 1, borderColor: P.line, backgroundColor: '#fff', borderRadius: 10, minHeight: 48, paddingHorizontal: 14, fontSize: 16, color: P.ink, fontFamily: 'DMSans_400Regular', marginBottom: 16 } as const;

const st = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: P.line, backgroundColor: '#fff' },
  menuButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#eef3ff', alignItems: 'center', justifyContent: 'center' },
  storeLink: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  drawer: { width: '82%', maxWidth: 310, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: P.line },
  brand: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingVertical: 24, paddingHorizontal: 22, borderBottomWidth: 1, borderBottomColor: P.line },
  navLink: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 46, borderRadius: 10, marginVertical: 3 },
  navOn: { backgroundColor: P.royal50, borderLeftWidth: 3, borderLeftColor: P.royal },
  avatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: P.royal50, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 26, lineHeight: 31, letterSpacing: -0.9, color: P.ink },
  helpLink: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: P.line, borderRadius: 10 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  primary: { backgroundColor: P.royal },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: P.line },
  next: { backgroundColor: P.royal50, borderWidth: 1, borderColor: P.line, borderRadius: 16, padding: 20, marginBottom: 24 },
  actionIcon: { padding: 10, borderRadius: 12, backgroundColor: P.royal50, alignSelf: 'center' },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: P.line, borderRadius: 16 },
  surfaceBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: P.line, borderRadius: 16, marginBottom: 16 },
  metric: { flexBasis: '47%', flexGrow: 1, padding: 20, borderWidth: 1, borderColor: P.line, borderRadius: 16, backgroundColor: '#fff' },
  section: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: P.line, backgroundColor: '#fff', minHeight: 44, justifyContent: 'center' },
});

/** Panel look for the older account screens: merged over their own StyleSheet so only appearance changes. */
export const panelStyles = StyleSheet.create({
  screen: { paddingVertical: 24, paddingHorizontal: 16, paddingBottom: 40 },
  heading: { fontSize: 26, lineHeight: 31, letterSpacing: -0.9, color: P.ink, fontFamily: 'DMSans_700Bold', marginBottom: 16 },
  title: { fontSize: 20, color: P.ink, fontFamily: 'DMSans_700Bold', marginBottom: 12 },
  name: { fontSize: 18, color: P.ink, fontFamily: 'DMSans_700Bold', marginVertical: 8 },
  description: { fontSize: 14, lineHeight: 21, color: P.muted, fontFamily: 'DMSans_400Regular', marginBottom: 16 },
  text: { fontSize: 14, lineHeight: 21, color: P.body, fontFamily: 'DMSans_400Regular', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: P.line, borderRadius: 16, padding: 18, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: P.line, backgroundColor: P.paper, borderRadius: 12, minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: P.ink, fontFamily: 'DMSans_400Regular', marginBottom: 16 },
  button: { backgroundColor: P.royal, borderRadius: 10, minHeight: 44, paddingVertical: 12, paddingHorizontal: 16, justifyContent: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontSize: 14, fontFamily: 'DMSans_600SemiBold', textAlign: 'center' },
  link: { color: P.royal, fontSize: 14, fontFamily: 'DMSans_600SemiBold', paddingVertical: 12 },
  control: { minHeight: 44, justifyContent: 'center' },
  error: { color: '#b91c1c', fontSize: 14, fontFamily: 'DMSans_400Regular', marginBottom: 12 },
});
