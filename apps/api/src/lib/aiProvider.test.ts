import assert from 'node:assert/strict';
import { callRecommendationProvider } from './aiProvider.js';
const config = { provider: 'deepseek' as const, model: 'deepseek-flash' as const, apiKey: 'fixture-not-a-real-key' };
const needs = { lojaId: 'store', tipo: 'celular', orcamento: 1000, uso: 'nao-sei' };
const product = { id: 'phone', lojaId: 'store', nome: 'Private catalog label', categoria: 'Celulares', preco: 900, estoque: 1, ativo: true, atributosTecnicos: {} };
const envelope = (content: unknown) => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(content) } }], usage: { prompt_tokens: 100, completion_tokens: 20 } });
let calls = 0;
const valid: typeof fetch = async (url, options) => {
  calls++;
  assert.equal(String(url), 'https://api.deepseek.com/chat/completions');
  assert.equal(options?.redirect, 'error');
  const body = String(options?.body);
  assert.equal(body.includes(product.nome), false);
  assert.equal(body.includes('store'), false);
  assert.equal(body.includes('900'), false);
  assert.equal(body.includes(config.apiKey), false);
  return new Response(JSON.stringify(envelope({ ids: ['phone'] })));
};
assert.deepEqual((await callRecommendationProvider(config, needs, [product], valid)).ids, ['phone']);
await callRecommendationProvider(config, { ...needs, uso: 'fotos', prioridade: 'bateria' }, [product], async (_url, options) => {
  const payload = JSON.parse(String(options?.body));
  const input = JSON.parse(payload.messages[1].content);
  assert.equal(input.uso, 'fotos');
  assert.equal(input.prioridade, 'bateria');
  assert.equal(input.catalogo[0].bateriaMah, null);
  assert.equal(input.catalogo[0].ordemPreco, 1);
  assert.equal(JSON.stringify(input).includes(product.nome), false);
  return new Response(JSON.stringify(envelope({ ids: ['phone'] })));
});
await assert.rejects(callRecommendationProvider(config, { ...needs, email: 'private@example.invalid' }, [product], valid));
assert.equal(calls, 1, 'Personal extra fields must be rejected before dispatch');
for (const invalid of [{ ids: ['invented'] }, { ids: ['phone', 'phone'] }, { ids: ['phone'], preco: 1 }, { ids: [] }]) {
  await assert.rejects(callRecommendationProvider(config, needs, [product], async () => new Response(JSON.stringify(envelope(invalid)))), /AI_PROVIDER_UNAVAILABLE/);
}
await assert.rejects(callRecommendationProvider(config, needs, [product], async () => new Response('x'.repeat(65537))), /AI_PROVIDER_UNAVAILABLE/);
await assert.rejects(callRecommendationProvider(config, needs, [product], async () => new Response('secret-provider-error', { status: 401 })), /AI_PROVIDER_UNAVAILABLE/);
const qwen = { provider: 'qwen' as const, model: 'qwen3.5-flash' as const, workspace: 'fixture-workspace', apiKey: 'fixture-not-a-real-key' };
await callRecommendationProvider(qwen, needs, [product], async url => { assert.equal(String(url), 'https://fixture-workspace.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions'); return new Response(JSON.stringify(envelope({ ids: ['phone'] }))); });
await assert.rejects(callRecommendationProvider({ ...qwen, workspace: 'attacker.invalid/path' }, needs, [product], valid));
console.log('AI provider privacy, bounded responses, catalog IDs and fixed endpoints passed.');
