export type Operator = 'TIM' | 'VIVO' | 'CLARO';
export type Guide = { id: string; operadora: Operator; topico: string; titulo: string; resumo: string; passos: string[]; fonte: string; canalOficial: string; revisadoEm: string; validoAte: string };
export const guideMaxChars = 300000;
const domains = { TIM: 'tim.com.br', VIVO: 'vivo.com.br', CLARO: 'claro.com.br' };
const topics = ['planos', 'saldo-consumo', 'chip-esim', 'internet-apn', 'sinal', 'chamadas-sms', 'portabilidade', 'perda-roubo', 'aplicativos'];
function official(value: unknown, operator: Operator) {
  if (typeof value !== 'string' || value.length > 1500) return false;
  try {
    const url = new URL(value), domain = domains[operator];
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') && (url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch { return false; }
}
export function guideRows(value: unknown, now = Date.now()): Guide[] {
  if (!Array.isArray(value)) throw new Error('Guias inválidos.');
  const rows = value.slice(0, 100).map(value => {
    if (!value || typeof value !== 'object') throw new Error('Guia inválido.');
    const row = value as Record<string, unknown>;
    if (typeof row.operadora !== 'string' || !Object.hasOwn(domains, row.operadora) || !topics.includes(row.topico as string)) throw new Error('Operadora ou assunto inválido.');
    const operator = row.operadora as Operator;
    for (const [key, limit] of [['id', 100], ['titulo', 120], ['resumo', 600], ['revisadoEm', 40], ['validoAte', 40]] as const) {
      if (typeof row[key] !== 'string' || !row[key] || (row[key] as string).length > limit) throw new Error('Guia inválido.');
    }
    if (!Array.isArray(row.passos) || !row.passos.length || row.passos.length > 12 || row.passos.some(step => typeof step !== 'string' || !step || step.length > 600)) throw new Error('Passos inválidos.');
    const reviewed = Date.parse(row.revisadoEm as string), expiry = Date.parse(row.validoAte as string);
    if (!Number.isFinite(reviewed) || !Number.isFinite(expiry) || reviewed > now || expiry <= reviewed || expiry - reviewed > 180 * 86400000 || !official(row.fonte, operator) || !official(row.canalOficial, operator)) throw new Error('Revisão ou fonte inválida.');
    return { id: row.id as string, operadora: operator, topico: row.topico as string, titulo: row.titulo as string, resumo: row.resumo as string, passos: [...row.passos] as string[], fonte: row.fonte as string, canalOficial: row.canalOficial as string, revisadoEm: row.revisadoEm as string, validoAte: row.validoAte as string };
  });
  return rows.filter(row => Date.parse(row.validoAte) > now);
}
export function parseGuideSnapshot(raw: string, now = Date.now()) {
  if (raw.length > guideMaxChars) throw new Error('Guias salvos excedem o limite.');
  const saved = JSON.parse(raw);
  if (saved.version !== 1 || typeof saved.storeId !== 'string' || !saved.storeId || saved.storeId.length > 100 || !Number.isSafeInteger(saved.savedAt) || saved.savedAt > now || now - saved.savedAt > 48 * 3600000) throw new Error('Consulta salva expirou.');
  return { storeId: saved.storeId as string, savedAt: saved.savedAt as number, guides: guideRows(saved.guides, now) };
}
