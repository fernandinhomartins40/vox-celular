// "Minhas descobertas" from the PWA (pages/Descobertas.jsx): pending matches to save, or saved devices.
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { assetUrl, hasSavedSession, request } from '../src/api';
import { addToCart } from '../src/cart';
import { DiscoveryShell, YellowButton, readDiscoveries, updateDiscoveries, vibeImage, type Pending } from '../src/discovery';
import { C, brandIcon, font, money } from '../src/ui';

type Product = { id: string; lojaId: string; nome: string; categoria: string; preco: number; estoque: number; imgUrl: string; atributosTecnicos?: { tipo?: string } };
const isDevice = (row: Product) => ['Celulares', 'Tablets'].includes(row.categoria) || ['celular', 'tablet'].includes(row.atributosTecnicos?.tipo || '');

export default function Discoveries() {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const [candidates, setCandidates] = useState<Product[]>([]);
  const [saved, setSaved] = useState<Product[]>([]);
  const [signedIn, setSignedIn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [index, setIndex] = useState(0);
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const selection = await readDiscoveries();
      const session = await hasSavedSession();
      const [favorites, products] = await Promise.all([session ? request<Product[]>('/favoritos', undefined, true) : Promise.resolve([]), selection ? request<Product[]>(`/produtos?lojaId=${encodeURIComponent(selection.lojaId)}`) : Promise.resolve([])]);
      if (!active) return;
      setSignedIn(session); setPending(selection);
      setSaved(favorites.filter(isDevice));
      setCandidates(products.filter(product => selection?.ids.includes(product.id)));
      setError('');
    })().catch(e => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível consultar.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]));
  const rows = pending ? candidates : saved;
  const product = rows[Math.min(index, Math.max(0, rows.length - 1))];
  async function save() {
    if (busy || !pending || !candidates.length) return;
    if (!signedIn) { router.navigate('/conta'); return; }
    setBusy(true); setError(''); setMessage('');
    const succeeded: Product[] = [], failed: string[] = [];
    for (const candidate of candidates) {
      try { await request(`/favoritos/${encodeURIComponent(candidate.id)}`, {}, true, 'PUT'); succeeded.push(candidate); }
      catch (e) { failed.push(candidate.id); setError(e instanceof Error ? e.message : 'Não foi possível salvar.'); }
    }
    const remaining = failed.length ? { ...pending, ids: failed } : null;
    await updateDiscoveries(remaining).catch(() => {});
    setSaved(previous => [...succeeded, ...previous.filter(row => !succeeded.some(item => item.id === row.id))]);
    setCandidates(previous => previous.filter(row => failed.includes(row.id)));
    setPending(remaining); setIndex(0); setBusy(false);
    if (succeeded.length) setMessage(failed.length ? `${succeeded.length} descoberta(s) salva(s). Tente novamente para guardar o restante.` : 'Descobertas salvas na sua conta.');
  }
  async function buy() {
    if (busy || !product) return;
    setBusy(true); setError('');
    try {
      const current = await request<Product>(`/produtos/${encodeURIComponent(product.id)}?lojaId=${encodeURIComponent(product.lojaId)}`);
      if (current.lojaId !== product.lojaId || current.estoque < 1 || !Number.isFinite(current.preco) || current.preco < 0) throw new Error('Este aparelho está indisponível no momento.');
      await addToCart(current.lojaId, current.id, current.estoque);
      router.push('/carrinho');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível adicionar.'); }
    finally { setBusy(false); }
  }
  return <DiscoveryShell savedLink={false}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={[st.eyebrow, font(700)]}>{pending ? 'SÓ FALTA GUARDAR' : 'SEU UNIVERSO VOX'}</Text>
      <Text accessibilityRole="header" style={[st.title, font(700)]}>Minhas descobertas</Text>
      <Text style={[st.caption, font()]}>{pending ? 'Finalize e leve seus matches com você.' : 'Seus aparelhos favoritos, no seu tempo.'}</Text>
      {error ? <View accessibilityRole="alert" style={st.alert}><Text style={[{ color: '#9f1239', fontSize: 13 }, font()]}>{error}</Text>{!loading && !product ? <Pressable accessibilityRole="button" onPress={() => setRetry(v => v + 1)} style={{ minHeight: 36, justifyContent: 'center' }}><Text style={[{ color: C.blue, textDecorationLine: 'underline' }, font()]}>Tentar novamente</Text></Pressable> : null}</View> : null}
      {message ? <Text accessibilityLiveRegion="polite" style={[st.status, font()]}>{message}</Text> : null}
      {!signedIn && !pending && !loading ? <Text style={[st.caption, font()]}>Entre na sua conta para ver os aparelhos salvos.</Text> : null}
      {loading ? <Text style={[st.caption, font()]}>Buscando suas descobertas…</Text> : product ? <>
        <View key={product.id} style={st.card}>
          <Image source={product.imgUrl ? { uri: assetUrl(product.imgUrl) } : brandIcon} style={{ width: '100%', height: 180 }} resizeMode="contain" accessibilityLabel={product.nome} />
          <Text numberOfLines={2} style={[{ fontSize: 19, lineHeight: 25, color: '#18315a', textAlign: 'center' }, font(700)]}>{product.nome}</Text>
          <Text style={[{ fontSize: 26, color: C.blue }, font(700)]}>{money(product.preco)}</Text>
          <Text style={[{ fontSize: 11, color: '#62728b' }, font()]}>{product.estoque > 0 ? 'Disponível na loja' : 'Sem estoque no momento'}</Text>
          {!pending && <YellowButton label="Adicionar ao carrinho" trailing="" disabled={busy || product.estoque < 1} onPress={buy} style={{ alignSelf: 'stretch', marginTop: 6 }} />}
        </View>
        <View style={st.pager}>
          <Pressable accessibilityRole="button" accessibilityLabel="Descoberta anterior" disabled={busy || index === 0} onPress={() => setIndex(v => v - 1)} style={[st.arrow, (busy || index === 0) && { opacity: 0.3 }]}><Text style={{ color: '#fff', fontSize: 20 }}>←</Text></Pressable>
          <Text style={[{ fontSize: 12, color: '#d8e9ff' }, font()]}>{Math.min(index + 1, rows.length)} de {rows.length}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Próxima descoberta" disabled={busy || index >= rows.length - 1} onPress={() => setIndex(v => v + 1)} style={[st.arrow, (busy || index >= rows.length - 1) && { opacity: 0.3 }]}><Text style={{ color: '#fff', fontSize: 20 }}>→</Text></Pressable>
        </View>
        {pending && <YellowButton label={busy ? 'Salvando…' : signedIn ? 'Salvar minhas descobertas' : 'Entrar para salvar'} trailing="✦" disabled={busy} onPress={save} style={{ width: '100%', maxWidth: 400, alignSelf: 'center' }} />}
      </> : <View style={st.empty}><Image source={vibeImage('nao-sei')} style={{ width: 140, height: 140 }} resizeMode="contain" /><Text style={[{ fontSize: 13, color: '#d0e3ff' }, font()]}>{pending ? 'Esses aparelhos não estão mais no catálogo.' : 'Seu próximo match está te esperando.'}</Text></View>}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 18 }}>
        <Pressable accessibilityRole="link" onPress={() => router.replace('/assistente')} style={{ minHeight: 36, justifyContent: 'center' }}><Text style={[{ fontSize: 11, color: '#b9d1ff' }, font()]}>Fazer nova descoberta ↗</Text></Pressable>
        {pending && <Pressable accessibilityRole="button" disabled={busy} onPress={() => { updateDiscoveries(null).catch(() => {}); setPending(null); setIndex(0); }} style={st.adjust}><Text style={[{ fontSize: 12, color: '#d7e5ff' }, font()]}>Ver minhas salvas</Text></Pressable>}
      </View>
    </ScrollView>
  </DiscoveryShell>;
}

const st = StyleSheet.create({
  eyebrow: { textAlign: 'center', letterSpacing: 2, fontSize: 9, color: '#ffdf72', marginBottom: 10 },
  title: { textAlign: 'center', fontSize: 30, letterSpacing: -1, color: '#fff', marginBottom: 8 },
  caption: { textAlign: 'center', fontSize: 12, lineHeight: 18, color: '#c5d9ff', marginBottom: 18 },
  alert: { backgroundColor: '#fff1f2', padding: 12, borderRadius: 14, marginBottom: 14 },
  status: { fontSize: 12, textAlign: 'center', backgroundColor: 'rgba(186,255,223,0.09)', borderWidth: 1, borderColor: 'rgba(186,255,223,0.27)', borderRadius: 12, color: '#cbffe7', padding: 10, marginBottom: 14, overflow: 'hidden' },
  card: { width: '100%', maxWidth: 400, alignSelf: 'center', alignItems: 'center', gap: 6, paddingVertical: 16, paddingHorizontal: 22, borderRadius: 26, borderWidth: 1, borderColor: '#fff', backgroundColor: 'rgba(240,244,255,0.95)', shadowColor: '#00185f', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 16 }, elevation: 10 },
  pager: { flexDirection: 'row', gap: 20, alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
  arrow: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 20, minHeight: 220 },
  adjust: { borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.09)', padding: 10, minHeight: 40, justifyContent: 'center' },
});
