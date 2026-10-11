import { useEffect, useId, useRef, useState } from 'react';
import PanelDialog from './PanelDialog';
import { compressCanvas, openImageFile } from '../../lib/imageUpload';

export default function PanelImageEditor({ file, profile, onClose, onApply }) {
  const canvas = useRef(null);
  const modeId = useId();
  const [loaded, setLoaded] = useState(null);
  const [mode, setMode] = useState('contain');
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true, source;
    openImageFile(file).then(value => { source = value.source; if (active) setLoaded(value.image); else URL.revokeObjectURL(source); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; if (source) URL.revokeObjectURL(source); };
  }, [file]);
  useEffect(() => {
    if (!loaded) return;
    const ctx = canvas.current.getContext('2d');
    const scale = (mode === 'contain' ? Math.min : Math.max)(profile.width / loaded.naturalWidth, profile.height / loaded.naturalHeight) * zoom;
    const width = loaded.naturalWidth * scale, height = loaded.naturalHeight * scale;
    ctx.clearRect(0, 0, profile.width, profile.height);
    if (profile.id === 'product') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, profile.width, profile.height); }
    ctx.drawImage(loaded, (profile.width - width) * x / 100, (profile.height - height) * y / 100, width, height);
  }, [loaded, mode, zoom, x, y, profile]);
  async function apply() {
    setBusy(true); setError('');
    try { await onApply(await compressCanvas(canvas.current, profile.id === 'background' ? 600000 : 300000)); }
    catch (e) { setError(e.message); setBusy(false); }
  }
  return <PanelDialog label="Preparar imagem" onClose={() => { if (!busy) onClose(); }} layer="z-90">
    <div className="panel-image-editor">
      <header><h2>Preparar imagem</h2><p>{profile.width} × {profile.height} px · WebP</p></header>
      <div className="panel-image-editor-body">
        <canvas ref={canvas} width={profile.width} height={profile.height} aria-label="Prévia do recorte" />
        {!loaded && !error && <p role="status">Abrindo imagem…</p>}
        <div><label htmlFor={modeId}>Enquadramento</label><select id={modeId} disabled={busy} value={mode} onChange={e => { setMode(e.target.value); setZoom(1); }}><option value="contain">Mostrar imagem inteira</option><option value="cover">Preencher e recortar</option></select></div>
        {[['Zoom', zoom, setZoom, 1, 3, .05], ['Posição horizontal', x, setX, 0, 100, 1], ['Posição vertical', y, setY, 0, 100, 1]].map(([label, value, setter, min, max, step]) => <label key={label}>{label}<input disabled={busy} type="range" min={min} max={max} step={step} value={value} onChange={e => setter(Number(e.target.value))} /></label>)}
        <p className="panel-muted">O recorte é convertido e comprimido antes do envio. O arquivo original não será armazenado.</p>
        {error && <p role="alert">{error}</p>}
      </div>
      <footer><button type="button" disabled={busy} className="panel-secondary-button" onClick={onClose}>Cancelar</button><button type="button" disabled={busy || !loaded} className="panel-primary-button" onClick={apply}>{busy ? 'Preparando…' : 'Usar imagem'}</button></footer>
    </div>
  </PanelDialog>;
}
