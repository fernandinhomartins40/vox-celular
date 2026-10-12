import assert from 'node:assert/strict';
import { usdToMicro } from './aiMoney.js';
assert.equal(usdToMicro('25'), 25000000);
assert.equal(usdToMicro('0.30'), 300000);
assert.equal(usdToMicro('0.000001'), 1);
assert.equal(usdToMicro('999.999999'), 999999999);
assert.equal(usdToMicro('1000.000000'), 1000000000);
for (const invalid of ['0', '-1', '1,20', '1e2', '0.0000001', '1000.000001', 'Infinity', ' 1', '99999999999999', null]) assert.throws(() => usdToMicro(invalid));
console.log('AI USD decimal parsing and micro-dollar boundaries passed.');
