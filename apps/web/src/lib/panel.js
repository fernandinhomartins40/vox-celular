export const ORDER_STATUS = { NOVO: 'Novo', EM_PREPARO: 'Em preparo', PRONTO: 'Pronto', ENTREGUE: 'Entregue' };
export const ORDER_NEXT = { NOVO: 'EM_PREPARO', EM_PREPARO: 'PRONTO', PRONTO: 'ENTREGUE' };
export const ORDER_ADMIN_GUIDANCE = {
  NOVO: 'Confira os itens, combine pagamento e entrega com o cliente e inicie o preparo.',
  EM_PREPARO: 'Separe e confira os itens. Marque como pronto quando terminar.',
  PRONTO: 'Avise o cliente. Confirme a entrega somente depois de entregar os itens.',
  ENTREGUE: 'Atendimento concluído. Os detalhes da compra continuam disponíveis aqui.',
};
export const ORDER_ACTION = { NOVO: 'Iniciar preparo', EM_PREPARO: 'Marcar como pronto', PRONTO: 'Confirmar entrega' };
export const ORDER_GUIDANCE = {
  NOVO: 'A loja recebeu o pedido. Fale com a equipe para combinar pagamento e entrega.',
  EM_PREPARO: 'Seu pedido está em preparo. A loja está organizando os itens.',
  PRONTO: 'Seu pedido está pronto. Combine a retirada ou entrega com a loja.',
  ENTREGUE: 'Compra concluída. Se precisar de ajuda, fale com a loja.',
};
export const normalizeSearch = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export const orderLink = (prefix, id) => `${prefix}/pedidos?pedido=${encodeURIComponent(id)}`;
export function setPanelParams(setParams, values, replace = true) {
  setParams(previous => {
    const next = new URLSearchParams(previous);
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    return next;
  }, { replace });
}
export function formatPanelDate(value) {
  if (!value) return '—';
  // Date-only values are calendar dates, not midnight UTC instants.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split('-').reverse().join('/');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(date);
}
export function orderTimeline(order) {
  if (order.timeline?.length) return order.timeline;
  const statuses = Object.keys(ORDER_STATUS);
  const current = statuses.indexOf(order.status);
  return ['Pedido recebido', 'Em preparo', 'Pronto para retirada', 'Entregue'].map((status, index) => ({
    status, ok: current >= index, data: index === 0 ? order.createdAt ?? order.data : null,
  }));
}
export function productStepError(form, image, isNew, step) {
  if (step === 'basico') {
    if (form.nome.trim().length < 2) return 'Informe o nome do produto com pelo menos 2 caracteres.';
    if (!form.categoria) return 'Escolha a categoria.';
    if (!form.descricao.trim()) return 'Descreva o produto para ajudar o cliente a escolher.';
    if (isNew && !image) return 'Adicione uma foto do produto.';
  }
  if (step === 'precos') {
    if (!Number.isFinite(Number(form.preco)) || Number(form.preco) <= 0) return 'Informe um preço maior que zero.';
    if (!Number.isInteger(Number(form.estoque)) || Number(form.estoque) < 0) return 'Informe uma quantidade inteira de estoque, a partir de zero.';
    if (form.precoOriginal !== '' && (!Number.isFinite(Number(form.precoOriginal)) || Number(form.precoOriginal) < 0)) return 'O preço anterior deve ser um valor válido, a partir de zero.';
  }
  return '';
}
