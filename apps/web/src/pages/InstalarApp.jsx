import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

export default function InstalarApp() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const offer = event => { event.preventDefault(); setPrompt(event); };
    const done = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', offer);
    window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', offer); window.removeEventListener('appinstalled', done); };
  }, []);
  async function install() {
    try { await prompt.prompt(); await prompt.userChoice; setPrompt(null); }
    catch { setMessage('Use o menu do navegador para adicionar a Vox à tela inicial.'); }
  }
  return <main style={{ maxWidth: 620, margin: '0 auto', padding: '32px 24px', paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
    <Link to="/" aria-label="Voltar à loja"><BrandLogo /></Link>
    <h1 className="font-bold text-3xl mt-8 mb-4">A Vox na sua tela inicial</h1>
    <p className="mb-6">Acesse a loja e acompanhe seus pedidos com mais facilidade.</p>
    {installed ? <p role="status">Você já está usando a Vox como aplicativo.</p> : <>
      {prompt && <button className="bg-blue-700 text-white rounded-xl px-6 py-3 mb-6" onClick={install}>Instalar Vox Celular</button>}
      <h2 className="font-bold text-xl mb-3">No iPhone ou iPad</h2>
      <ol className="list-decimal pl-6 space-y-2 mb-6"><li>Abra a loja no Safari.</li><li>Toque em Compartilhar.</li><li>Escolha “Adicionar à Tela de Início” e confirme.</li></ol>
      <h2 className="font-bold text-xl mb-3">No Android</h2>
      <ol className="list-decimal pl-6 space-y-2 mb-6"><li>Abra a loja no Chrome.</li><li>Abra o menu do navegador.</li><li>Escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.</li></ol>
      <p>As opções podem variar conforme o navegador. Produtos, preços e compras precisam de conexão.</p>
    </>}
    {message && <p role="status">{message}</p>}
    <Link to="/" className="inline-block text-blue-700 underline mt-6">Continuar na loja</Link>
  </main>;
}
