-- Additive indexes for existing tenant/date/relation filters. No data removal.
BEGIN;
CREATE INDEX "Usuario_email_idx" ON "Usuario" ("email");
CREATE INDEX "Pedido_lojaId_createdAt_idx" ON "Pedido" ("lojaId", "createdAt");
CREATE INDEX "Pedido_clienteId_createdAt_idx" ON "Pedido" ("clienteId", "createdAt");
CREATE INDEX "Produto_lojaId_ativo_destaque_idx" ON "Produto" ("lojaId", "ativo", "destaque");
CREATE INDEX "Cliente_lojaId_createdAt_idx" ON "Cliente" ("lojaId", "createdAt");
CREATE INDEX "ItemPedido_pedidoId_idx" ON "ItemPedido" ("pedidoId");
CREATE INDEX "TimelinePedido_pedidoId_ordem_idx" ON "TimelinePedido" ("pedidoId", "ordem");
CREATE INDEX "Promocao_lojaId_ativa_validade_idx" ON "Promocao" ("lojaId", "ativa", "validade");
CREATE INDEX "HistoricoPontos_clienteId_createdAt_idx" ON "HistoricoPontos" ("clienteId", "createdAt");
CREATE INDEX "RecompensaCatalogo_lojaId_ativo_idx" ON "RecompensaCatalogo" ("lojaId", "ativo");
COMMIT;
