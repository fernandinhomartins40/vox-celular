import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
let revision = 1, available = true, failShare = false, switchDuringRequest = false;
const files = new Map(), shared = [];
const exported = { exportadoEm: '2026-10-13T12:00:00Z', perfil: { usuario: { nome: 'Cliente' } }, pedidos: [{ id: 'order' }] };
globalThis.__exportFixture = {
  File: class {
    constructor(_base, name) { this.uri = `file:///cache/${name}`; }
    get exists() { return files.has(this.uri); }
    write(data) { files.set(this.uri, data); }
    delete() { files.delete(this.uri); }
  },
  Paths: { cache: 'file:///cache/' },
  Sharing: {
    isAvailableAsync: async () => available,
    shareAsync: async (uri, options) => {
      if (failShare) throw new Error('Share failed');
      shared.push({ uri, options, data: JSON.parse(files.get(uri)) });
    },
  },
  randomUUID: () => 'fixture',
  sessionRevision: () => revision,
  requestForSession: async (expected, path) => {
    assert.equal(expected, revision); assert.equal(path, '/privacidade/exportar');
    if (switchDuringRequest) revision++;
    return exported;
  },
};
let source = await readFile(new URL('../../apps/mobile/src/accountExport.ts', import.meta.url), 'utf8');
source = source.replace(/^import .*;\r?\n/gm, '');
source = `const { File, Paths, Sharing, randomUUID, requestForSession, sessionRevision } = globalThis.__exportFixture;\n${source}`;
const { shareAccountExport } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`);
await shareAccountExport(revision, () => true);
assert.deepEqual(shared[0].data, exported, 'All returned collections must be included');
assert.equal(shared[0].options.mimeType, 'application/json');
assert.equal(files.size, 0, 'Temporary data must be removed after sharing');
failShare = true;
await assert.rejects(shareAccountExport(revision, () => true), /Share failed/);
assert.equal(files.size, 0, 'Failed sharing must clean up');
failShare = false; available = false;
await assert.rejects(shareAccountExport(revision, () => true), /não está disponível/);
assert.equal(files.size, 0);
available = true; switchDuringRequest = true;
await assert.rejects(shareAccountExport(revision, () => true), /sessão mudou/);
assert.equal(shared.length, 1, 'A changed account must not share data from the old session');
switchDuringRequest = false;
await assert.rejects(shareAccountExport(revision, () => false), /sessão mudou/);
await shareAccountExport(revision, () => true);
assert.equal(shared.length, 2, 'Failures must release the export lock');
assert.equal(files.size, 0);
console.log('Native export: authenticated endpoint, complete JSON file, sharing failure cleanup and changed session rejection passed with native module mocks.');
