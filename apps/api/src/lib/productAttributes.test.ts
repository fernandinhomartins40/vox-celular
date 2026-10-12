import assert from 'node:assert/strict';
import { productAttributesSchema } from './productAttributes.js';
assert.equal(productAttributesSchema.safeParse({}).success, true);
assert.equal(productAttributesSchema.safeParse({ tipo: 'tablet', ramGB: 8, armazenamentoGB: 128, fonte: 'https://example.com/specifications', verificado: true }).success, true);
for (const data of [{ verificado: true }, { ramGB: -1 }, { bateriaMah: 3.5 }, { fonte: 'http://example.com' }, { processadorInventado: 'unknown' }]) assert.equal(productAttributesSchema.safeParse(data).success, false);
console.log('PASS: structured catalog attributes, optional unknown data, ranges and source requirements.');
