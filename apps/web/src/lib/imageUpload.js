export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp,image/svg+xml';
export function imageProfile(section, key) {
  if (key === 'background') return { id: 'background', width: 1600, height: 700 };
  if (section === 'categories') return { id: 'category', width: 800, height: 450 };
  if (section === 'portability') return { id: 'portability', width: 600, height: 450 };
  if (section === 'hero') return { id: 'hero', width: 900, height: 900 };
  return { id: 'product', width: 900, height: 900 };
}
export async function compressCanvas(canvas, maxBytes = 300000) {
  for (const quality of [.82, .74, .66, .58, .5]) {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
    if (!blob || blob.type !== 'image/webp') throw new Error('Este navegador não consegue converter para WebP. Use um navegador atualizado.');
    if (blob.size <= maxBytes) return { dataUrl: await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); }), bytes: blob.size };
  }
  throw new Error('A imagem ficou muito pesada. Escolha uma foto menos detalhada.');
}
export async function openImageFile(file) {
  if (!file.type.startsWith('image/') || file.size > 15 * 1024 * 1024) throw new Error('Escolha uma imagem de até 15 MB.');
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = source; });
    if (image.naturalWidth * image.naturalHeight > 40000000) throw new Error('Escolha uma imagem de até 40 megapixels.');
    return { source, image };
  } catch { URL.revokeObjectURL(source); throw new Error('Não foi possível abrir esta imagem. Use JPG, PNG, WebP, AVIF, GIF, BMP ou SVG válido.'); }
}
