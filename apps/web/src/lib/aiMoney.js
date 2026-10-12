export function usdToMicro(value) {
  if (typeof value !== 'string' || !/^\d{1,4}(\.\d{1,6})?$/.test(value)) throw new Error('Use valores em dólares, com ponto decimal e até seis casas.');
  const [whole, fraction = ''] = value.split('.');
  const result = Number(whole) * 1000000 + Number(fraction.padEnd(6, '0'));
  if (result <= 0 || result > 1000000000) throw new Error('Use valores maiores que zero e até US$ 1.000.');
  return result;
}
