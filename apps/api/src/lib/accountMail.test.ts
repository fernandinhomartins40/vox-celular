import assert from 'node:assert/strict';
import { accountMail } from './accountMail.js';
const token = 'a'.repeat(43);
for (const purpose of ['RECUPERAR_SENHA', 'VERIFICAR_EMAIL'] as const) {
  const mail = accountMail('https://www.voxcelular.com.br', 'store-1', token, purpose);
  const url = new URL(mail.text.split('\n').find(line => line.startsWith('https:'))!);
  assert.equal(url.pathname, '/confirmar-conta');
  assert.equal(url.search, '');
  const fragment = new URLSearchParams(url.hash.slice(1));
  assert.equal(fragment.get('token'), token);
  assert.equal(fragment.get('lojaId'), 'store-1');
  assert.equal(fragment.get('acao'), purpose === 'VERIFICAR_EMAIL' ? 'verificar-email' : 'recuperar-senha');
}
for (const origin of ['http://vox.example', 'https://user:pass@vox.example', 'https://vox.example:8443', 'https://vox.example/path', 'https://vox.example/?redirect=bad', 'https://vox.example/#bad']) {
  assert.throws(() => accountMail(origin, 'store', token, 'RECUPERAR_SENHA'));
}
assert.throws(() => accountMail('https://vox.example', 'store\r\n', token, 'RECUPERAR_SENHA'));
assert.throws(() => accountMail('https://vox.example', 'store', 'invalid', 'RECUPERAR_SENHA'));
console.log('Account email content: fixed HTTPS origin, fragment-only token and purpose-specific links passed.');
