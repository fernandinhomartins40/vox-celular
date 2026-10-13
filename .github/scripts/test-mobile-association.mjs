import assert from 'node:assert/strict';
import { androidAssociation, appleAssociation, mobileLinkPaths } from '../../apps/api/dist/lib/mobileAssociation.js';
assert.deepEqual(androidAssociation(undefined), []);
assert.deepEqual(appleAssociation(undefined).applinks.details, []);
const fingerprint = Array(32).fill('AB').join(':');
assert.deepEqual(androidAssociation(`${fingerprint},${fingerprint.toLowerCase()}`)[0].target.sha256_cert_fingerprints, [fingerprint]);
assert.equal(androidAssociation(fingerprint)[0].target.package_name, 'br.com.voxcelular.cliente');
assert.equal(appleAssociation('A123456789').applinks.details[0].appID, 'A123456789.br.com.voxcelular.cliente');
assert.deepEqual(appleAssociation('A123456789').applinks.details[0].paths, mobileLinkPaths);
for (const invalid of ['', 'AB:CD', 'x'.repeat(100), `${fingerprint},`]) { if (invalid) assert.throws(() => androidAssociation(invalid)); }
for (const invalid of ['short', 'lowercase1', 'A123456789/path']) assert.throws(() => appleAssociation(invalid));
console.log('Domain associations: disabled without identity, bounded fingerprints, fixed app and exact Apple paths passed.');
