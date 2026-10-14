import { z } from 'zod';

export const operators = ['TIM', 'VIVO', 'CLARO', 'ALGAR'] as const;
const domains = { TIM: 'tim.com.br', VIVO: 'vivo.com.br', CLARO: 'claro.com.br', ALGAR: 'algar.com.br' };
export function officialOperatorUrl(value: string, operator: typeof operators[number]) {
  try {
    const url = new URL(value);
    const domain = domains[operator];
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443')
      && (url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch { return false; }
}
export const operatorGuideSchema = z.object({
  operadora: z.enum(operators),
  topico: z.enum(['planos', 'saldo-consumo', 'chip-esim', 'internet-apn', 'sinal', 'chamadas-sms', 'portabilidade', 'perda-roubo', 'aplicativos']),
  titulo: z.string().trim().min(2).max(120),
  resumo: z.string().trim().min(5).max(600),
  passos: z.array(z.string().trim().min(2).max(600)).min(1).max(12),
  fonte: z.string().url().max(1500),
  canalOficial: z.string().url().max(1500),
  revisadoEm: z.string().datetime(),
  validoAte: z.string().datetime(),
  publicado: z.boolean(),
}).strict().superRefine((data, ctx) => {
  for (const field of ['fonte', 'canalOficial'] as const) if (!officialOperatorUrl(data[field], data.operadora)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'Use uma página HTTPS no domínio oficial da operadora.' });
  const reviewed = Date.parse(data.revisadoEm), expires = Date.parse(data.validoAte);
  if (reviewed > Date.now() || expires <= reviewed || expires - reviewed > 180 * 86400000) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['validoAte'], message: 'Revisão não pode ser futura; validade deve ser posterior e de até 180 dias.' });
  if (data.publicado && expires <= Date.now()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['publicado'], message: 'Revise o guia vencido antes de publicar.' });
});
