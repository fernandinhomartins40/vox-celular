import assert from 'node:assert/strict';
import { allowedWebOrigin } from './webOrigins.js';

for (const configured of ['https://www.voxcelular.com.br', 'https://voxcelular.com.br']) {
  for (const origin of ['https://www.voxcelular.com.br', 'https://voxcelular.com.br']) assert.equal(allowedWebOrigin(origin, configured), true);
  for (const origin of [undefined, '', 'null', 'http://voxcelular.com.br', 'https://evil.voxcelular.com.br', 'https://voxcelular.com.br.evil.example', 'https://voxcelular.com.br:8443', 'https://voxcelular.com.br/', 'https://user@voxcelular.com.br', 'http://localhost:3000']) assert.equal(allowedWebOrigin(origin, configured), false);
}
assert.equal(allowedWebOrigin('http://localhost:3000', 'http://localhost:3000'), true);
assert.equal(allowedWebOrigin('https://voxcelular.com.br', 'http://localhost:3000'), false);
assert.equal(allowedWebOrigin('https://voxcelular.com.br', 'https://other.example'), false);
console.log('Web origins: both official HTTPS hosts allowed; absent, spoofed, insecure and unrelated origins rejected.');
