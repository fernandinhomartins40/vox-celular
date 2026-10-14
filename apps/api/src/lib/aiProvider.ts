import { z } from 'zod';
import { recommendationSchema, rankProducts, type Candidate } from './recommendations.js';
import { productAttributesSchema } from './productAttributes.js';

const configSchema = z.discriminatedUnion('provider', [
  z.object({ provider: z.literal('deepseek'), apiKey: z.string().min(8).max(512).regex(/^[^\s]+$/), model: z.literal('deepseek-flash') }).strict(),
  z.object({ provider: z.literal('qwen'), apiKey: z.string().min(8).max(512).regex(/^[^\s]+$/), model: z.literal('qwen3.5-flash'), workspace: z.string().regex(/^[a-zA-Z0-9-]{1,64}$/) }).strict(),
]);
export type AiProviderConfig = z.infer<typeof configSchema>;
const responseSchema = z.object({
  choices: z.array(z.object({ finish_reason: z.literal('stop'), message: z.object({ content: z.string().max(4000) }) })).length(1),
  usage: z.object({ prompt_tokens: z.number().int().nonnegative().max(100000), completion_tokens: z.number().int().nonnegative().max(512) }),
});
const selectionSchema = z.object({ ids: z.array(z.string().min(1).max(100)).min(1).max(3) }).strict();
export async function callRecommendationProvider(configuration: AiProviderConfig, input: unknown, products: Candidate[], transport: typeof fetch = fetch) {
  const config = configSchema.parse(configuration);
  const needs = recommendationSchema.parse(input);
  if (products.length > 500) throw new Error('AI_INPUT_LIMIT');
  // Deterministic constraints remain authoritative before and after the model call.
  const candidates = rankProducts(products, needs);
  if (!candidates.length) throw new Error('AI_NO_CANDIDATES');
  const priceOrder = [...candidates].sort((a, b) => a.produto.preco - b.produto.preco || a.produto.id.localeCompare(b.produto.id));
  const catalog = candidates.map(({ produto }) => {
    const parsed = productAttributesSchema.safeParse(produto.atributosTecnicos);
    const attributes = parsed.success && parsed.data.verificado ? parsed.data : {};
    return { id: produto.id, ordemPreco: priceOrder.findIndex(row => row.produto.id === produto.id) + 1, ramGB: attributes.ramGB ?? null, armazenamentoGB: attributes.armazenamentoGB ?? null, bateriaMah: attributes.bateriaMah ?? null };
  });
  const endpoint = config.provider === 'deepseek' ? 'https://api.deepseek.com/chat/completions' : `https://${config.workspace}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions`;
  const started = performance.now();
  try {
    const response = await transport(endpoint, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.model, stream: false, max_tokens: 512, temperature: 0,
        messages: [{ role: 'system', content: 'Order up to three provided product IDs for the stated use. Return JSON only: {"ids":["id"]}. Use only listed IDs. Missing specifications are unknown. Do not return names, prices, explanations or additional fields.' },
          { role: 'user', content: JSON.stringify({ uso: needs.uso, tipo: needs.tipo, prioridade: needs.prioridade ?? 'equilibrado', catalogo: catalog }) }] }),
    });
    if (!response.ok || !response.body) { await response.body?.cancel(); throw new Error('AI_HTTP'); }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        bytes += next.value.byteLength;
        if (bytes > 65536) throw new Error('AI_RESPONSE_LIMIT');
        chunks.push(next.value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    const envelope = responseSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    const selection = selectionSchema.parse(JSON.parse(envelope.choices[0].message.content));
    if (new Set(selection.ids).size !== selection.ids.length || selection.ids.some(id => !candidates.some(candidate => candidate.produto.id === id))) throw new Error('AI_INVALID_IDS');
    return { ids: selection.ids, inputTokens: envelope.usage.prompt_tokens, outputTokens: envelope.usage.completion_tokens, latencyMs: Math.ceil(performance.now() - started), provider: config.provider, model: config.model };
  } catch { throw new Error('AI_PROVIDER_UNAVAILABLE'); }
}
