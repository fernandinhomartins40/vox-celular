export function orderContactUrl(phone: string, code: string) {
  if (typeof phone !== 'string' || phone.length > 40 || typeof code !== 'string' || !code.trim() || code.length > 100) throw new Error('Contato da loja indisponível.');
  const digits = phone.replace(/\D/g, '');
  const number = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  if (!/^55\d{10,11}$/.test(number)) throw new Error('Telefone da loja indisponível.');
  return `https://wa.me/${number}?text=${encodeURIComponent(`Olá! Preciso de ajuda com o pedido ${code.trim()}.`)}`;
}
