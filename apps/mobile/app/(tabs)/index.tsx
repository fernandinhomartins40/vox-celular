import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { assetUrl, request } from '../../src/api';
type Store = { nome: string; endereco: string; cidade: string };
export default function Home() {
  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    request<Store>('/loja').then(data => { if (active) { setStore(data); setError(''); } }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível consultar a loja.'); });
    return () => { active = false; };
  }, [reload]);
  const link = { color: '#0036cc', paddingVertical: 16, fontWeight: '600' as const };
  return <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}><Image source={{ uri: assetUrl('/brand/vox-blue-red.webp') }} accessibilityLabel="Vox Celular" resizeMode="contain" style={{ height: 100, width: '100%', marginBottom: 20 }} /><Text accessibilityRole="header" style={{ color: '#10243e', fontSize: 28, fontWeight: '700', marginBottom: 12 }}>Seu próximo aparelho começa aqui.</Text><Text style={{ color: '#52647b', lineHeight: 22, marginBottom: 20 }}>Encontre produtos, acompanhe pedidos e cuide do seu celular com a Vox.</Text><View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce4f3', borderRadius: 16, padding: 20, marginBottom: 20 }}><Link href="/loja" style={link}>Escolher no catálogo</Link><Link href="/assistente" style={link}>Preciso de ajuda para escolher</Link><Link href="/servicos" style={link}>Solicitar um atendimento</Link></View><View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce4f3', borderRadius: 16, padding: 20 }}><Text accessibilityRole="header" style={{ color: '#10243e', fontSize: 19, fontWeight: '700', marginBottom: 12 }}>Sua loja</Text>{error ? <><Text accessibilityRole="alert" style={{ color: '#9c1230' }}>{error}</Text><Text accessibilityRole="button" onPress={() => setReload(value => value + 1)} style={link}>Consultar novamente</Text></> : store ? <><Text style={{ color: '#10243e', fontWeight: '600', marginBottom: 12 }}>{store.nome}</Text><Text style={{ color: '#52647b', lineHeight: 22 }}>{store.endereco}{store.cidade ? ` · ${store.cidade}` : ''}</Text></> : <ActivityIndicator color="#0036cc" />}<Link href="/conta" style={link}>Minha conta, pedidos e benefícios</Link></View></ScrollView>;
}
