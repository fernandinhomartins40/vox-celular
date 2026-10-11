ALTER TABLE "Pedido" ADD COLUMN "checkoutKey" TEXT, ADD COLUMN "estoqueReservado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Pedido" ADD COLUMN "canceladoEm" TIMESTAMP(3);
CREATE UNIQUE INDEX "Pedido_clienteId_checkoutKey_key" ON "Pedido"("clienteId", "checkoutKey");
