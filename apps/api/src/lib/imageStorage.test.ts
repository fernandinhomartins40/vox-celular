import assert from 'node:assert/strict';
import sharp from 'sharp';
import { normalizedImage, IMAGE_PROFILES } from './imageStorage.js';

for (const format of ['jpeg', 'png', 'webp', 'avif'] as const) {
  const input = await sharp({ create: { width: 160, height: 90, channels: 3, background: '#123abc' } }).toFormat(format).toBuffer();
  const result = await normalizedImage(`data:image/${format};base64,${input.toString('base64')}`, 'category');
  const meta = await sharp(result).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(meta.width, 800); assert.equal(meta.height, 450);
  assert.ok(result.length <= 400000);
  assert.equal(meta.exif, undefined);
}
await assert.rejects(normalizedImage('data:image/webp;base64,ZmFrZQ==', 'product'));
await assert.rejects(normalizedImage('data:image/svg+xml;base64,PHN2Zz4=', 'product'));
const oversized = await sharp({ create: { width: 4000, height: 4000, channels: 3, background: 'white' } }).png().toBuffer();
await assert.rejects(normalizedImage(`data:image/png;base64,${oversized.toString('base64')}`, 'product'));
const transparent = await sharp({ create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
for (const profile of Object.keys(IMAGE_PROFILES) as (keyof typeof IMAGE_PROFILES)[]) {
  const image = await normalizedImage(`data:image/png;base64,${transparent.toString('base64')}`, profile);
  const meta = await sharp(image).metadata();
  assert.equal(meta.width, IMAGE_PROFILES[profile][0]); assert.equal(meta.height, IMAGE_PROFILES[profile][1]);
  if (profile === 'hero') assert.equal(meta.hasAlpha, true);
}
console.log('PASS: four input formats converted to bounded exact-size WebP; metadata removed; forged files, SVG and oversized pixel counts rejected.');
