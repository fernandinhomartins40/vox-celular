// Store from the PWA (/app/loja): search, category chips, ordering and the two-column product grid.
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { loadCatalog } from '../../src/offlineCatalog';
import { filterCatalog, type Sort } from '../../src/catalog';
import { ProductGrid, type CatalogItem } from '../../src/ProductCard';
import { Icon } from '../../src/icons';
import { AppHeader, C, Heading, Message, font } from '../../src/ui';

const sorts: [Sort, string][] = [['destaque', 'Em destaque'], ['menor', 'Menor preço'], ['maior', 'Maior preço']];

export default function Catalog() {
  const [products, setProducts] = useState<CatalogItem[] | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [sort, setSort] = useState<Sort>('destaque');
  const [sorting, setSorting] = useState(false);
  useEffect(() => {
    let active = true;
    loadCatalog().then(result => { if (active) { setProducts(result.products); setSavedAt(result.savedAt); setError(''); } }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível consultar o catálogo.'); });
    return () => { active = false; };
  }, [reload]);
  const filtered = useMemo(() => filterCatalog(products || [], { category, search, sort }), [products, category, search, sort]);
  const categories = ['Todos', ...new Set((products || []).map(row => row.categoria))];
  const sortLabel = sorts.find(([value]) => value === sort)![1];
  return <View style={{ flex: 1, backgroundColor: C.bg }}>
    <AppHeader />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
      <Heading title="Loja" subtitle="Encontre seu próximo aparelho." />
      <View style={st.search}><Icon.search size={21} color="#78849a" /><TextInput accessibilityLabel="Buscar na loja do aplicativo" placeholder="Buscar aparelho ou acessório" placeholderTextColor="#8792a5" value={search} onChangeText={setSearch} autoCorrect={false} maxLength={100} style={[st.input, font()]} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel="Categorias" contentContainerStyle={{ gap: 8, paddingTop: 16, paddingBottom: 12 }}>
        {categories.map(value => { const on = category === value; return <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setCategory(value)} style={[st.chip, on && st.chipOn]}><Text style={[{ fontSize: 12, color: on ? C.white : C.muted }, font()]}>{value}</Text></Pressable>; })}
      </ScrollView>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ordenar catálogo: ${sortLabel}`} accessibilityState={{ expanded: sorting }} onPress={() => setSorting(v => !v)} style={st.sort}>
        <Text style={[{ fontSize: 12, color: C.muted }, font()]}>{sortLabel}</Text><Text style={{ fontSize: 10, color: C.muted }}>▾</Text>
      </Pressable>
      {sorting && <View style={st.menu}>{sorts.map(([value, label]) => <Pressable key={value} accessibilityRole="menuitem" accessibilityState={{ selected: value === sort }} onPress={() => { setSort(value); setSorting(false); }} style={st.option}><Text style={[{ fontSize: 14, color: value === sort ? C.blue : C.text }, font(value === sort ? 700 : 400)]}>{label}</Text></Pressable>)}</View>}
      {savedAt ? <Message action="Consultar catálogo online" onAction={() => setReload(v => v + 1)}>{`Consulta salva em ${new Date(savedAt).toLocaleString('pt-BR')}. Preços e estoque precisam de confirmação online.`}</Message> : null}
      {error ? <Message tone="error" action="Tentar novamente" onAction={() => { setError(''); setProducts(null); setReload(v => v + 1); }}>{error}</Message>
        : products === null ? <Message>Carregando produtos…</Message> : null}
      {notice ? <Message>{notice}</Message> : null}
      {products && !error && (filtered.length ? <ProductGrid products={filtered} onNotice={setNotice} offline={Boolean(savedAt)} /> : <Message>{products.length ? 'Nenhum produto encontrado. Ajuste sua busca.' : 'Nenhum produto publicado no momento.'}</Message>)}
    </ScrollView>
  </View>;
}

const st = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, paddingHorizontal: 14, backgroundColor: C.white, borderWidth: 1, borderColor: C.line2, borderRadius: 16, minHeight: 50 },
  input: { flex: 1, fontSize: 16, color: C.text, paddingVertical: 8 },
  chip: { minHeight: 42, justifyContent: 'center', borderWidth: 1, borderColor: '#e1e7f2', borderRadius: 14, backgroundColor: C.white, paddingHorizontal: 14 },
  chipOn: { backgroundColor: C.blue, borderColor: C.blue },
  menu: { alignSelf: 'flex-start', backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 14, marginTop: -8, marginBottom: 12, paddingVertical: 4 },
  option: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 42, paddingHorizontal: 4, marginBottom: 12 },
});
