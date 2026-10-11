# Implementação incremental multicanal

Plano aprovado pelo usuário em 11/10/2026: `PLANO_MULTICANAL.md`.

## Incremento 1 — segurança e compra persistida

- Login da interface envia a loja; login legado sem loja só funciona se houver um único usuário com aquele e-mail, evitando selecionar arbitrariamente outro tenant.
- Middleware consulta usuário/loja/role e versão de token no banco. Troca de senha incrementa a versão atomicamente; tokens antigos são recusados, inclusive se emitidos no mesmo segundo. Tokens legados são versão zero, preservando sessões até revogação.
- `POST /api/pedidos` exige cliente autenticado, UUID de tentativa e até 30 itens com quantidades inteiras. Preço, loja, visibilidade e saldo são conferidos no servidor.
- Transação reserva a quantidade reduzindo `Produto.estoque`, que neste incremento continua representando saldo disponível. Não foi criado ainda saldo físico separado nem ledger de movimentos. Essa evolução permanece necessária antes de multicanal.
- Advisory lock por cliente/tentativa serializa reenvios concorrentes. Índice único protege idempotência; locks dos produtos seguem ordem estável e débito condicionado ao saldo impede saldo negativo nas compras locais.
- Carrinho persiste por sessão durante login, registra o pedido, mostra o código e link ao acompanhamento. WhatsApp continua disponível. Pagamento é explicitamente aguardando confirmação; não há gateway simulado.
- Cancelamento pelo lojista de checkout NOVO libera saldo uma única vez, registra timeline e impede avanço posterior. Pedidos antigos ou já em preparo não são cancelados por esse fluxo, pois exigem contabilização/condições adicionais. Não representa reembolso.
- Migrations aditivas preservam IDs/dados e não alteram enum dos quatro status antigos; cancelamento é indicado por `canceladoEm` nos painéis.

## Validação

Build API/web e lint locais. Testes CI com PostgreSQL real cobrem criação, duas tentativas simultâneas da mesma compra, saldo esgotado, isolamento de cancelamento por tenant/role, liberação idempotente, bloqueio de avanço e revogação após senha. Testes existentes de painéis seguem como regressão. Dados de CI não são executados na VPS.

## Trabalho restante do plano

Este incremento não conclui as Etapas 0 e 1. Ainda faltam permissões/vendedores, rate limits, paginação server-side, identificação multi-loja pública, backup externo, SKU/atributos/galeria/variantes/kits, saldo físico/reservas/movimentos, estados financeiros/logísticos completos e checkout com endereço. Etapas 2–5 (fila/conectores, OAuth, anúncios, reconciliação, logística/fiscal/pós-venda, regras/margens) ainda não foram implementadas. Autorizações de marketplaces são dependências reais para ativação, não para construir módulos internos.

Não afirmar integração externa homologada ou garantia distribuída de ausência de overselling. Nenhuma credencial externa foi solicitada ou armazenada neste incremento.
