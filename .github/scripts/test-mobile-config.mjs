import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { expo } = JSON.parse(await readFile(new URL('../../apps/mobile/app.json', import.meta.url), 'utf8'));
assert.equal(expo.android.package, 'br.com.voxcelular.cliente');
assert.equal(expo.ios.bundleIdentifier, expo.android.package);
assert.equal(expo.scheme, 'voxcelular');
assert.deepEqual([...expo.ios.associatedDomains].sort(), ['applinks:voxcelular.com.br', 'applinks:www.voxcelular.com.br']);
const hosts = new Set(['voxcelular.com.br', 'www.voxcelular.com.br']);
const paths = new Set(['/produto', '/assistente', '/novidades', '/area-cliente']);
const found = new Set();
for (const filter of expo.android.intentFilters) {
  assert.equal(filter.action, 'VIEW'); assert.equal(filter.autoVerify, true);
  assert.ok(filter.category.includes('BROWSABLE') && filter.category.includes('DEFAULT'));
  for (const data of filter.data) {
    assert.equal(data.scheme, 'https'); assert.ok(hosts.has(data.host)); assert.ok(paths.has(data.pathPrefix));
    found.add(`${data.host}${data.pathPrefix}`);
  }
}
assert.equal(found.size, hosts.size * paths.size);
assert.equal(expo.android.usesCleartextTraffic, undefined);
console.log('Native configuration: matching identifiers, exact associated domains and HTTPS verified intent filters passed.');
