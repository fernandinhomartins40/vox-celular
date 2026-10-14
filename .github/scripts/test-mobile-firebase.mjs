import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { validateFirebaseClientConfiguration } from './prepare-mobile-firebase.mjs';
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64');
const fixture = { project_info: { project_number: '123456', project_id: 'vox-fixture' }, client: [{ client_info: { android_client_info: { package_name: 'br.com.voxcelular.cliente' } }, api_key: [{ current_key: 'public-fixture-key' }] }] };
assert.deepEqual(JSON.parse(validateFirebaseClientConfiguration(encode(fixture))), fixture);
for (const config of [{ type: 'service_account', private_key: 'fixture' }, { ...fixture, private_key: 'fixture' }, {}, { ...fixture, client: {} }, { ...fixture, client: [{ client_info: { android_client_info: { package_name: 'another.app' } } }] }]) assert.throws(() => validateFirebaseClientConfiguration(encode(config)));
for (const raw of ['', 'invalid!', 'x'.repeat(131073), Buffer.from('not-json').toString('base64')]) assert.throws(() => validateFirebaseClientConfiguration(raw));
const require = createRequire(import.meta.url);
const configure = require('../../apps/mobile/app.config.js');
const previous = process.env.EXPO_PUBLIC_EXPO_PROJECT_ID;
try {
  const config = { name: 'Vox', android: { package: 'br.com.voxcelular.cliente' }, extra: { preserved: true } };
  process.env.EXPO_PUBLIC_EXPO_PROJECT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const result = configure({ config });
  assert.equal(result.android.package, config.android.package);
  assert.equal(result.extra.preserved, true);
  assert.equal(result.extra.eas.projectId, process.env.EXPO_PUBLIC_EXPO_PROJECT_ID);
  process.env.EXPO_PUBLIC_EXPO_PROJECT_ID = 'invalid'; assert.throws(() => configure({ config }));
  delete process.env.EXPO_PUBLIC_EXPO_PROJECT_ID; assert.equal(configure({ config }).extra.eas, undefined);
} finally { if (previous === undefined) delete process.env.EXPO_PUBLIC_EXPO_PROJECT_ID; else process.env.EXPO_PUBLIC_EXPO_PROJECT_ID = previous; }
console.log('Mobile build configuration: correct Android package, bounded client file, service-account rejection and public Expo project validation passed.');
