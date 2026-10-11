import './brand.css';

export default function BrandLogo({ brand = 'VOX', inverse = false }) {
  if (brand.trim().toUpperCase() !== 'VOX') return <strong>{brand}</strong>;
  return <img className={`brand-logo${inverse ? ' brand-logo-inverse' : ''}`} src="/brand/vox-blue-red.webp" width="480" height="362" alt="Vox Celular" />;
}
