import { z } from 'zod';

export const productAttributesSchema = z.object({
  tipo: z.enum(['celular', 'tablet', 'acessorio', 'outro']).optional(),
  marca: z.string().trim().max(80).optional(),
  modelo: z.string().trim().max(120).optional(),
  ramGB: z.number().positive().max(128).optional(),
  armazenamentoGB: z.number().positive().max(8192).optional(),
  bateriaMah: z.number().int().positive().max(100000).optional(),
  fonte: z.string().url().max(1000).refine(value => value.startsWith('https://'), 'Use uma fonte HTTPS.').optional(),
  verificado: z.boolean().optional(),
}).strict().refine(value => !value.verificado || Boolean(value.fonte), { message: 'Informe a fonte antes de marcar as características como verificadas.', path: ['fonte'] });
