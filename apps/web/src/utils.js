export const formatBRL = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatBRLNoSym = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const badgeStyle = (b) => {
  if (b === 'OFERTA')     return 'bg-[var(--red-500)] text-white';
  if (b === 'TOP VENDAS') return 'bg-white text-[var(--royal-700)] border border-[var(--royal-100)]';
  if (b === 'NOVO')       return 'bg-emerald-600 text-white';
  if (b === 'SEMINOVO')   return 'bg-amber-500 text-white';
  if (b === 'TIM')        return 'bg-[var(--royal-700)] text-white';
  return 'bg-zinc-900 text-white';
};
