function contactUrl(phone: string, code: string, subject: 'pedido' | 'atendimento') {
  if (typeof phone !== 'string' || phone.length > 40 || typeof code !== 'string' || !code.trim() || code.length > 100) throw new Error('Contato da loja indisponível.');
  const digits = phone.replace(/\D/g, '');
  const number = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  if (!/^55\d{10,11}$/.test(number)) throw new Error('Telefone da loja indisponível.');
  return `https://wa.me/${number}?text=${encodeURIComponent(`Olá! Preciso de ajuda com o ${subject} ${code.trim()}.`)}`;
}
export const orderContactUrl = (phone: string, code: string) => contactUrl(phone, code, 'pedido');
export const serviceContactUrl = (phone: string, protocol: string) => contactUrl(phone, protocol, 'atendimento');
