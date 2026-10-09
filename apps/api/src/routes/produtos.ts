import { Router } from 'express';
import { z } from 'zod';
import path from 'node:path';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { prisma } from '../lib/prisma.js';
import { requireLojista, AuthRequest } from '../middleware/auth.js';

export const produtosRouter = Router();

const uploadsRoot = process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads');
const publicUploadsPath = '/uploads/produtos';

const imageSchema = z.object({
  dataUrl: z.string().startsWith('data:image/'),
}).optional();

const productPayloadSchema = z.object({
  nome: z.string().trim().min(2).optional(),
  sub: z.string().trim().min(1).optional(),
  categoria: z.string().trim().min(1).optional(),
  preco: z.number().nonnegative().optional(),
  precoOriginal: z.number().nonnegative().nullable().optional(),
  badge: z.string().trim().nullable().optional(),
  descricao: z.string().trim().min(1).optional(),
  estoque: z.number().int().nonnegative().optional(),
  ativo: z.boolean().optional(),
  destaque: z.boolean().optional(),
  specs: z.array(z.string().trim()).optional(),
  image: imageSchema,
});

const createSchema = productPayloadSchema.extend({
  nome: z.string().trim().min(2),
  sub: z.string().trim().min(1),
  categoria: z.string().trim().min(1),
  preco: z.number().nonnegative(),
  descricao: z.string().trim().min(1),
});

function serializeProduto<T extends {
  preco: unknown;
  precoOriginal: unknown | null;
  imgUrl: string;
}>(produto: T) {
  return {
    ...produto,
    preco: Number(produto.preco),
    precoOriginal: produto.precoOriginal === null ? null : Number(produto.precoOriginal),
    img: produto.imgUrl,
  };
}

function parseDataUrl(dataUrl: string) {
  const match = /^data:image\/(webp|jpeg|jpg|png);base64,([a-z0-9+/=]+)$/i.exec(dataUrl);
  if (!match) return null;
  const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) return null;
  return { ext, buffer };
}

async function saveProductImage(lojaId: string, produtoId: string, dataUrl?: string) {
  if (!dataUrl) return null;
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error('Imagem invalida. Envie PNG, JPG ou WebP ate 5 MB.');

  const dir = path.join(uploadsRoot, 'produtos', lojaId);
  await mkdir(dir, { recursive: true });
  const fileName = `${produtoId}-${Date.now()}.${parsed.ext}`;
  await writeFile(path.join(dir, fileName), parsed.buffer);
  return `${publicUploadsPath}/${lojaId}/${fileName}`;
}

async function removeLocalImage(imgUrl?: string | null) {
  if (!imgUrl?.startsWith(publicUploadsPath)) return;
  const relative = imgUrl.replace(/^\/uploads\//, '');
  const fullPath = path.join(uploadsRoot, relative);
  if (!fullPath.startsWith(path.join(uploadsRoot, 'produtos'))) return;
  await unlink(fullPath).catch(() => undefined);
}

function compactSpecs(specs?: string[]) {
  if (!specs) return undefined;
  return specs.map((s) => s.trim()).filter(Boolean).slice(0, 12);
}

produtosRouter.get('/', async (req, res) => {
  const lojaId = Array.isArray(req.query.lojaId) ? String(req.query.lojaId[0]) : String(req.query.lojaId ?? '');
  if (!lojaId || lojaId === 'undefined') {
    res.status(400).json({ error: 'lojaId obrigatorio' });
    return;
  }
  const produtos = await prisma.produto.findMany({
    where: { lojaId, ativo: true },
    orderBy: { destaque: 'desc' },
  });
  res.json(produtos.map(serializeProduto));
});

produtosRouter.get('/admin', requireLojista, async (req: AuthRequest, res) => {
  const produtos = await prisma.produto.findMany({
    where: { lojaId: req.user!.lojaId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(produtos.map(serializeProduto));
});

produtosRouter.post('/', requireLojista, async (req: AuthRequest, res) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.errors }); return; }

  const { image, specs, badge, precoOriginal, estoque, ativo, destaque, ...data } = parse.data;
  const produto = await prisma.produto.create({
    data: {
      lojaId: req.user!.lojaId,
      ...data,
      precoOriginal: precoOriginal ?? null,
      badge: badge || null,
      estoque: estoque ?? 0,
      ativo: ativo ?? true,
      destaque: destaque ?? false,
      specs: compactSpecs(specs) ?? [],
      imgUrl: '',
    },
  });

  try {
    const imgUrl = await saveProductImage(req.user!.lojaId, produto.id, image?.dataUrl);
    const updated = await prisma.produto.update({
      where: { id: produto.id },
      data: { imgUrl: imgUrl ?? '' },
    });
    res.status(201).json(serializeProduto(updated));
  } catch (error) {
    await prisma.produto.delete({ where: { id: produto.id } }).catch(() => undefined);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Erro ao salvar imagem' });
  }
});

produtosRouter.patch('/:id', requireLojista, async (req: AuthRequest, res) => {
  const produtoId = String(req.params.id);
  const parse = productPayloadSchema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: parse.error.errors }); return; }

  const produto = await prisma.produto.findFirst({
    where: { id: produtoId, lojaId: req.user!.lojaId },
  });
  if (!produto) { res.status(404).json({ error: 'Produto nao encontrado' }); return; }

  let imgUrl: string | null = null;
  try {
    const { image, specs, badge, ...data } = parse.data;
    imgUrl = await saveProductImage(req.user!.lojaId, produto.id, image?.dataUrl);

    const updated = await prisma.produto.update({
      where: { id: produtoId },
      data: {
        ...data,
        ...(badge !== undefined ? { badge: badge || null } : {}),
        ...(specs !== undefined ? { specs: compactSpecs(specs) } : {}),
        ...(imgUrl ? { imgUrl } : {}),
      },
    });
    if (imgUrl) await removeLocalImage(produto.imgUrl);
    res.json(serializeProduto(updated));
  } catch (error) {
    if (imgUrl) await removeLocalImage(imgUrl);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Erro ao salvar produto' });
  }
});
