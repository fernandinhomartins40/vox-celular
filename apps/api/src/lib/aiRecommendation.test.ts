import assert from 'node:assert/strict';
import { budgetedRecommendation } from './aiRecommendation.js';
const events: string[] = [];
const needs = { lojaId: 'fixture', tipo: 'celular', uso: 'nao-sei', orcamento: 1000 };
const provider = { provider: 'deepseek' as const, model: 'deepseek-flash' as const, apiKey: 'fixture-key' };
const rates = { monthlyLimitMicroUsd: 25000000, inputRateMicroUsd: 300000, outputRateMicroUsd: 1200000 };
const dependencies = {
  reserve: async (...args: unknown[]) => { events.push('reserve'); assert.equal(args[0], 'fixture'); assert.equal(args[3], 30615); return { id: 'reservation' }; },
  call: async () => { events.push('call'); return { ids: ['phone'], inputTokens: 100, outputTokens: 20, latencyMs: 10, provider: 'deepseek', model: 'deepseek-flash' }; },
  settle: async (...args: unknown[]) => { events.push('settle'); assert.equal(args[1], 'reservation'); assert.equal(args[2], 54); },
};
// Narrow mocks intentionally validate order and accounting, not PostgreSQL behavior.
const result = await budgetedRecommendation(provider, rates, needs, [], dependencies as never);
assert.equal(result.costMicroUsd, 54);
assert.deepEqual(events, ['reserve', 'call', 'settle']);
events.length = 0;
await assert.rejects(budgetedRecommendation(provider, rates, needs, [], { ...dependencies, reserve: async () => { throw new Error('AI_BUDGET_EXCEEDED'); } } as never), /EXCEEDED/);
assert.equal(events.length, 0, 'Budget refusal must prevent provider dispatch');
await assert.rejects(budgetedRecommendation(provider, rates, needs, [], { ...dependencies, call: async () => { events.push('call'); throw new Error('Timeout'); }, settle: async (...args: unknown[]) => { events.push('uncertain'); assert.equal(args[2], undefined); } } as never), /UNAVAILABLE/);
assert.deepEqual(events, ['reserve', 'call', 'uncertain']);
console.log('AI reservation-before-call and conservative failure accounting passed.');
