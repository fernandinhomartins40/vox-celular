import sharp from 'sharp';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile, readdir, stat, statfs } from 'node:fs/promises';
import path from 'node:path';

sharp.cache(false);
sharp.concurrency(1);
export const IMAGE_PROFILES = { product: [900, 900], hero: [900, 900], category: [800, 450], background: [1600, 700], portability: [600, 450] } as const;
export type ImageProfile = keyof typeof IMAGE_PROFILES;
let processing = 0;
export async function normalizedImage(dataUrl: string, profile: ImageProfile) {
  if (processing >= 1) throw new Error('Há imagens sendo preparadas. Tente novamente em alguns segundos.');
  const match = /^data:image\/(webp|jpeg|jpg|png|avif|gif|bmp);base64,([a-z0-9+/=]+)$/i.exec(dataUrl);
  if (!match) throw new Error('Formato de imagem inválido.');
  const input = Buffer.from(match[2], 'base64');
  if (!input.length || input.length > 5 * 1024 * 1024) throw new Error('Imagem deve ter até 5 MB.');
  processing++;
  try {
    const meta = await sharp(input, { limitInputPixels: 12000000, pages: 1 }).metadata();
    if (!meta.format || !['jpeg', 'png', 'webp', 'avif', 'heif', 'gif'].includes(meta.format)) throw new Error('Conteúdo de imagem inválido.');
    const [width, height] = IMAGE_PROFILES[profile];
    const result = await sharp(input, { limitInputPixels: 12000000, pages: 1 }).rotate().resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: profile === 'product' ? 1 : 0 } }).webp({ quality: 80, effort: 3 }).timeout({ seconds: 8 }).toBuffer();
    if (result.length > (profile === 'background' ? 700000 : 400000)) throw new Error('Imagem muito pesada. Comprima antes de enviar.');
    return result;
  } finally { processing--; }
}
export async function storeImage(buffer: Buffer, folder: string, lojaId: string, unique = false) {
  if (!/^[a-zA-Z0-9_-]+$/.test(lojaId) || !['produtos', 'landing', 'catalogo'].includes(folder)) throw new Error('Destino inválido.');
  const name = `${createHash('sha256').update(buffer).digest('hex')}${unique ? '-' + randomUUID() : ''}.webp`;
  const root = process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads');
  const dir = path.join(root, folder, lojaId);
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, name);
  try { await stat(target); return `/uploads/${folder}/${lojaId}/${name}`; } catch { /* New image. */ }
  const files = await readdir(dir, { withFileTypes: true });
  if (files.length >= 1000) throw new Error('Limite de imagens atingido.');
  let used = 0;
  for (const file of files) if (file.isFile()) used += (await stat(path.join(dir, file.name))).size;
  if (used + buffer.length > 100 * 1024 * 1024) throw new Error('Limite de armazenamento de imagens atingido.');
  const disk = await statfs(dir);
  if (disk.bavail * disk.bsize < 128 * 1024 * 1024) throw new Error('Armazenamento temporariamente indisponível.');
  await writeFile(target, buffer, { flag: 'wx' }).catch(e => { if (e.code !== 'EEXIST') throw e; });
  return `/uploads/${folder}/${lojaId}/${name}`;
}
