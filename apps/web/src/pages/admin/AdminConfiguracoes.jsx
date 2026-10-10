import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api, assetUrl } from '../../lib/api';
import { PanelLoading, PanelError } from '../../components/panel/PanelFeedback';
import { resolveStoreContent } from '../../components/storeContent';
import { SECTIONS, LABELS } from './landingEditorFields';
import { Icon } from '../../icons';
import './landing-editor.css';

export default function AdminConfiguracoes() {
  const [params, setParams] = useSearchParams();
  const section = SECTIONS.some(([id]) => id === params.get('secao')) ? params.get('secao') : 'hero';
  const [config, setConfig] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [viewport, setViewport] = useState('desktop');
  const [ready, setReady] = useState(0);
  const frame = useRef(null);
  const editorRoot = useRef(null);
  const previewContainer = useRef(null);
  const [previewWidth, setPreviewWidth] = useState(900);
  const savingRef = useRef(false);
  useEffect(() => {
    if (loading || !previewContainer.current) return;
    const observer = new ResizeObserver(([entry]) => setPreviewWidth(Math.max(1, entry.contentRect.width - 24)));
    observer.observe(previewContainer.current);
    return () => observer.disconnect();
  }, [loading]);
  useEffect(() => {
    Promise.all([api.get('/config'), api.get('/produtos/admin')]).then(([data, items]) => {
      setConfig({ ...data, landingPage: resolveStoreContent(data) });
      setProducts(items.filter(p => p.ativo !== false).map(p => ({ ...p, img: assetUrl(p.imgUrl) })));
    }).catch(e => setLoadError(e.message)).finally(() => setLoading(false));
    const receive = event => { if (event.origin === location.origin && event.source === frame.current?.contentWindow && event.data?.type === 'vox-preview-ready') setReady(value => value + 1); };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  useEffect(() => {
    if (!ready || !config) return;
    frame.current?.contentWindow.postMessage({ type: 'vox-landing-preview', payload: { config, section, products } }, location.origin);
  }, [ready, config, section, products]);
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const update = (path, value) => {
    setConfig(previous => { const next = structuredClone(previous); let target = next.landingPage[section]; path.slice(0, -1).forEach(key => { target = target[key]; }); target[path.at(-1)] = value; return next; });
    setDirty(true); setSaved(false);
  };
  async function upload(path, file) {
    if (!file) return;
    setUploading(true); setError('');
    try {
      if (!file.type.startsWith('image/') || file.size > 15 * 1024 * 1024) throw new Error('Escolha uma imagem de até 15 MB.');
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const result = await api.post('/config/image', { dataUrl: canvas.toDataURL('image/webp', .85) });
      update(path, result.url);
    } catch (e) { setError(e.message || 'Não foi possível abrir a imagem.'); }
    finally { setUploading(false); }
  }
  async function save(event) {
    event.preventDefault(); if (savingRef.current || uploading) return;
    savingRef.current = true; setSaving(true); setError(''); setSaved(false);
    try {
      const body = Object.fromEntries(['horarioSemana', 'horarioSabado', 'instagramUrl', 'facebookUrl'].map(key => [key, config[key] ?? '']));
      body.landingPage = config.landingPage;
      body.heroSlide1Titulo = config.landingPage.hero.title;
      body.heroSlide1Sub = config.landingPage.hero.subtitle;
      body.heroSlide1Preco = config.landingPage.hero.price;
      await api.put('/config', body); setSaved(true); setDirty(false);
    } catch (e) { setError(e.message); }
    finally { savingRef.current = false; setSaving(false); }
  }
  const field = (value, path) => {
    const key = path.at(-1), name = LABELS[key] ?? key;
    if (Array.isArray(value)) return <div key={path.join('.')} className="editor-list"><h3>{name}</h3>{value.map((item, index) => <fieldset key={index}><legend>{name} {index + 1}</legend>{typeof item === 'object' ? Object.entries(item).map(([k, v]) => field(v, [...path, index, k])) : field(item, [...path, index])}<button type="button" disabled={saving || uploading || value.length === 1} className="editor-remove" onClick={() => update(path, value.filter((_, i) => i !== index))}>Remover item {index + 1}</button></fieldset>)}{value.length < 30 && <button type="button" disabled={saving || uploading} className="panel-secondary-button" onClick={() => update(path, [...value, typeof value[0] === 'object' ? structuredClone(value[0]) : ''])}>Adicionar item</button>}</div>;
    const id = `editor-${section}-${path.join('-')}`;
    const image = ['image', 'img'].includes(key) || (key === 'background' && section === 'hero');
    const options = key === 'font' ? ['DM Sans', 'Barlow', 'Barlow Condensed'] : key === 'radius' ? ['0', '8', '12', '16', '20', '24'] : null;
    return <div key={id} className="editor-field"><label htmlFor={id}>{typeof key === 'number' ? `Texto ${key + 1}` : name}</label>
      {options ? <select disabled={saving} id={id} value={value} onChange={e => update(path, e.target.value)}>{options.map(o => <option key={o}>{o}</option>)}</select> : section === 'design' && ['primary', 'accent', 'background'].includes(key) ? <input disabled={saving} id={id} type="color" value={value} onChange={e => update(path, e.target.value)} /> : ['title', 'subtitle', 'description', 'desc', 'texto', 'captionText'].includes(key) ? <textarea disabled={saving} id={id} rows={3} maxLength={2000} value={value} onInput={e => update(path, e.currentTarget.value)} /> : <input disabled={saving} id={id} type={typeof value === 'number' ? 'number' : 'text'} min={key === 'estrelas' ? 1 : undefined} max={key === 'estrelas' ? 5 : undefined} maxLength={2000} value={value} onChange={e => update(path, typeof value === 'number' ? Number(e.target.value) : e.target.value)} />}
      {image && <><input type="file" aria-label={`Enviar ${name}`} accept="image/*" disabled={saving || uploading} onChange={e => { upload(path, e.target.files?.[0]); e.target.value = ''; }} /><p className="panel-muted">Selecione um arquivo ou informe o endereço da imagem. O envio é preparado em WebP.</p></>}
      {key === 'phone' && <p className="panel-muted">Exemplo: 5542991031420. Este contato é usado pelos botões de WhatsApp.</p>}
      {key === 'icon' && <p className="panel-muted">Ícones disponíveis: {Object.keys(Icon).join(', ')}.</p>}
    </div>;
  };
  if (loading) return <PanelLoading />;
  if (loadError) return <PanelError message={loadError} />;
  return <form ref={editorRoot} onSubmit={save} className="landing-editor">
    <header className="editor-toolbar"><div><h1>Página da loja</h1><p>Escolha a seção, edite e confira antes de salvar.</p></div><div className="editor-save"><button type="button" className="panel-secondary-button" onClick={async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await editorRoot.current.requestFullscreen(); } catch { setError('Não foi possível expandir neste navegador. O editor continua disponível abaixo.'); } }}>Tela inteira</button><span role="status">{uploading ? 'Preparando imagem…' : saved ? 'Alterações salvas.' : dirty ? 'Alterações não salvas' : 'Conteúdo publicado'}</span><button type="submit" className="panel-primary-button" disabled={saving || uploading}>{saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar configurações'}</button></div></header>
    {error && <p role="alert" className="panel-inline-notice">{error}</p>}
    <div role="tablist" aria-label="Seções da landing page" className="editor-tabs">{SECTIONS.map(([id, label], index) => <button disabled={saving || uploading} type="button" role="tab" id={`tab-${id}`} aria-selected={section === id} aria-controls="editor-panel" tabIndex={section === id ? 0 : -1} key={id} onClick={() => setParams({ secao: id }, { flushSync: true })} onKeyDown={event => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? SECTIONS.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + SECTIONS.length) % SECTIONS.length; setParams({ secao: SECTIONS[next][0] }, { flushSync: true }); document.getElementById(`tab-${SECTIONS[next][0]}`)?.focus(); }}>{label}</button>)}</div>
    <div className="editor-body"><section role="tabpanel" id="editor-panel" aria-labelledby={`tab-${section}`} className="editor-settings">
      <h2>{SECTIONS.find(([id]) => id === section)[1]}</h2>
      {section === 'products' && <p className="panel-inline-notice">Fotos, preços e estoque vêm dos produtos cadastrados. <Link to="/admin/produtos">Gerenciar produtos</Link></p>}
      {Object.entries(config.landingPage[section]).map(([key, value]) => field(value, [key]))}
      {['contact', 'footer'].includes(section) && ['horarioSemana', 'horarioSabado', ...(section === 'footer' ? ['instagramUrl', 'facebookUrl'] : [])].map(key => <div className="editor-field" key={key}><label htmlFor={key}>{({ horarioSemana: 'Segunda a sexta', horarioSabado: 'Sábado', instagramUrl: 'Instagram (URL)', facebookUrl: 'Facebook (URL)' })[key]}</label><input disabled={saving} id={key} name={key} value={config[key] ?? ''} onChange={e => { setConfig(c => ({ ...c, [key]: e.target.value })); setDirty(true); setSaved(false); }} /></div>)}
    </section><section className="editor-preview" aria-label="Prévia real da seção"><header><strong>Prévia ao vivo</strong><div><button type="button" aria-pressed={viewport === 'desktop'} onClick={() => setViewport('desktop')}>Desktop</button><button type="button" aria-pressed={viewport === 'mobile'} onClick={() => setViewport('mobile')}>Celular</button></div></header><p>Mesmo componente da loja. Links e envios ficam desativados nesta prévia.</p><div ref={previewContainer} className="editor-preview-scroll"><iframe style={{ width: viewport === 'mobile' ? 390 : 1440, minWidth: viewport === 'mobile' ? 390 : 1440, zoom: Math.min(1, previewWidth / (viewport === 'mobile' ? 390 : 1440)), height: 900 }} ref={frame} title="Prévia real da landing page" src="/admin/landing-preview" className={viewport === 'mobile' ? 'is-mobile' : ''} /></div></section></div>
  </form>;
}
