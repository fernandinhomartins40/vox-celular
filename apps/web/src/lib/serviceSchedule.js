export function serviceSlotLabel(slot) {
  if (!slot) return '';
  const format = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
  return `${format.format(new Date(slot.inicio))} até ${format.format(new Date(slot.fim))} (horário de Brasília)`;
}
