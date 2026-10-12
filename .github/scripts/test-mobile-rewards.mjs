import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const values = new Map();
let failWrite = false;
globalThis.__rewardStorage = { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { if (failWrite) throw new Error('Storage failed'); values.set(key, value); }, removeItem: async key => values.delete(key) };
let userId = 'a';
let failure = true;
const requests = [];
globalThis.__rewardApi = { ApiError: class extends Error {}, requireCapability: async () => {}, sessionRevision: () => 1, request: async (path, body) => {
  if (path === '/auth/me') return { id: userId, role: 'CLIENTE' };
  assert.equal(JSON.parse(values.get('vox.reward.pending.v1')).chaveResgate, body.chaveResgate);
  requests.push(body.chaveResgate);
  if (failure) throw new TypeError('Network failed');
  return { codigo: 'VOX-CODE', saldo: 40 };
} };
const source = stripTypeScriptTypes((await readFile('apps/mobile/src/rewards.ts', 'utf8'))
  .replace("import AsyncStorage from '@react-native-async-storage/async-storage';", 'const AsyncStorage = globalThis.__rewardStorage;')
  .replace("import { randomUUID } from 'expo-crypto';", "const randomUUID = () => '72bd5565-4803-4a88-8e48-749ec60ed631';")
  .replace("import { ApiError, NativeUser, request, sessionRevision, requireCapability } from './api';", 'const { ApiError, request, sessionRevision, requireCapability } = globalThis.__rewardApi;'));
const load = suffix => import(`data:text/javascript;base64,${Buffer.from(source + `\n//${suffix}`).toString('base64')}`);
const initial = await load('initial');
await assert.rejects(initial.redeemReward('reward', 10), /Network/);
assert.ok(await initial.pendingReward());
const restarted = await load('restart');
userId = 'b';
await assert.rejects(restarted.redeemReward('reward', 10), /conta que iniciou/);
userId = 'a';
await assert.rejects(restarted.redeemReward('different-reward'), /pendente/);
assert.equal(requests.length, 1);
failure = false;
assert.equal((await restarted.redeemReward('reward', 10)).codigo, 'VOX-CODE');
assert.equal(requests[0], requests[1], 'Restart must reuse the same persisted key');
assert.equal(await restarted.pendingReward(), null);
failWrite = true;
await assert.rejects(restarted.redeemReward('reward', 10), /Storage/);
assert.equal(requests.length, 2, 'Storage failure must prevent network dispatch');
console.log('Native reward restart, ownership and persistence-before-dispatch passed.');
