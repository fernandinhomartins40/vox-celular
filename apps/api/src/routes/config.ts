import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireLojista, AuthRequest } from '../middleware/auth.js';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

const text = z.string().max(2000);
const primitive = z.union([text, z.number().finite()]);
const section = z.record(z.union([primitive, z.array(z.union([text, z.record(primitive)])).max(30)]));
const itemSchemas: Record<string, z.ZodTypeAny> = {
  benefits: z.object({ icon: text, title: text, sub: text }),
  categories: z.object({ label: text, sub: text, target: text, img: text }),
  steps: z.object({ title: text, text, href: text }),
  services: z.object({ icon: text, titulo: text, desc: text, tag: text }),
  testimonials: z.object({ nome: text, cidade: text, texto: text, estrelas: z.number().int().min(1).max(5) }),
  navigation: z.object({ icon: text, label: text, href: text }),
};
const landingSchema = z.object(Object.fromEntries(['design', 'header', 'hero', 'benefits', 'categories', 'products', 'portability', 'steps', 'services', 'testimonials', 'contact', 'footer', 'navigation'].map(key => [key, section.optional()]))).strict().superRefine((value, ctx) => {
  const inspect = (item: unknown, key = '') => {
    if (typeof item === 'string') {
      if (['image', 'img', 'background', 'mapsUrl', 'mapsEmbed', 'href'].includes(key) && item && !(key === 'background' && /^#[0-9a-f]{6}$/i.test(item)) && !/^(https?:\/\/|\/(?!\/)|#[a-zA-Z])/i.test(item)) ctx.addIssue({ code: 'custom', message: 'Use links HTTPS, caminhos locais ou âncoras.' });
      if (['primary', 'accent', 'background'].includes(key) && key !== 'background' && !/^#[0-9a-f]{6}$/i.test(item)) ctx.addIssue({ code: 'custom', message: 'Cor inválida.' });
    } else if (Array.isArray(item)) item.forEach(v => inspect(v, key));
    else if (item && typeof item === 'object') Object.entries(item).forEach(([k, v]) => inspect(v, k));
  };
  // Background can be a design color or a hero image URL.
  inspect(value);
  for (const [name, data] of Object.entries(value)) {
    if (!data) continue;
    for (const [key, field] of Object.entries(data)) {
      if (key === 'items' || key === 'announcements') {
        const expected = key === 'announcements' || name === 'portability' ? text : itemSchemas[name];
        if (!expected || !z.array(expected).min(1).max(30).safeParse(field).success) ctx.addIssue({ code: 'custom', message: 'Lista de conteúdo inválida.' });
      } else if (typeof field !== 'string') ctx.addIssue({ code: 'custom', message: 'Texto de seção inválido.' });
    }
  }
  const design = value.design;
  if (design && (!/^#[0-9a-f]{6}$/i.test(String(design.background)) || !['DM Sans', 'Barlow', 'Barlow Condensed'].includes(String(design.font)) || !/^(0|8|12|16|20|24)$/.test(String(design.radius)))) ctx.addIssue({ code: 'custom', message: 'Opções de design inválidas.' });
});

export const configRouter = Router();

configRouter.post('/image', requireLojista, async (req: AuthRequest, res) => {
  const parsed = z.object({ dataUrl: z.string().max(7000000).startsWith('data:image/webp;base64,') }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Envie uma imagem WebP de até 5 MB.' }); return; }
  const buffer = Buffer.from(parsed.data.dataUrl.split(',')[1], 'base64');
  if (buffer.length > 5 * 1024 * 1024 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') { res.status(400).json({ error: 'Imagem inválida.' }); return; }
  try {
    const folder = path.join(process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads'), 'landing', req.user!.lojaId);
    await mkdir(folder, { recursive: true });
    const name = `${randomUUID()}.webp`;
    await writeFile(path.join(folder, name), buffer);
    res.status(201).json({ url: `/uploads/landing/${req.user!.lojaId}/${name}` });
  } catch { res.status(500).json({ error: 'Não foi possível salvar a imagem.' }); }
});

configRouter.get('/', requireLojista, async (req: AuthRequest, res) => {
  const config = await prisma.lojaConfig.findUnique({ where: { lojaId: req.user!.lojaId } });
  res.json(config);
});

configRouter.put('/', requireLojista, async (req: AuthRequest, res) => {
  const schema = z.object({
    heroSlide1Titulo: z.string().max(300).optional(),
    heroSlide1Sub: z.string().max(1000).optional(),
    heroSlide1Preco: z.string().max(30).optional(),
    instagramUrl: z.string().max(500).optional(),
    facebookUrl: z.string().max(500).optional(),
    horarioSemana: z.string().max(200).optional(),
    horarioSabado: z.string().max(200).optional(),
    landingPage: landingSchema.refine(value => JSON.stringify(value).length <= 100000, 'Conteúdo muito grande').optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Configurações inválidas' }); return; }
  const config = await prisma.lojaConfig.upsert({
    where: { lojaId: req.user!.lojaId },
    update: parsed.data,
    create: { ...parsed.data, lojaId: req.user!.lojaId }
  });
  res.json(config);
});
