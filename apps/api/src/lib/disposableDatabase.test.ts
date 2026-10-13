import assert from 'node:assert/strict';
import { assertDisposableDatabase } from './disposableDatabase.js';
const environment = { CI: 'true', DATABASE_URL: 'postgresql://vox:ci-only-password@db:5432/voxcelular' };
assertDisposableDatabase('ci-disposable', environment);
assert.throws(() => assertDisposableDatabase(undefined, environment));
assert.throws(() => assertDisposableDatabase('ci-disposable', { ...environment, CI: 'false' }));
for (const url of ['postgresql://vox:ci-only-password@72.60.10.108:5432/voxcelular', 'postgresql://vox:other@db:5432/voxcelular', 'postgresql://vox:ci-only-password@db:5432/other', 'invalid']) assert.throws(() => assertDisposableDatabase('ci-disposable', { ...environment, DATABASE_URL: url }));
console.log('Disposable database guard rejects other hosts, credentials, databases and non-CI execution.');
