-- CreateTable
CREATE TABLE "NotificacaoCliente" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "chaveEvento" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proximaTentativaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificacaoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificacaoCliente_status_proximaTentativaEm_idx" ON "NotificacaoCliente"("status", "proximaTentativaEm");

-- CreateIndex
CREATE UNIQUE INDEX "NotificacaoCliente_clienteId_chaveEvento_key" ON "NotificacaoCliente"("clienteId", "chaveEvento");

-- AddForeignKey
ALTER TABLE "NotificacaoCliente" ADD CONSTRAINT "NotificacaoCliente_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificacaoCliente" ADD CONSTRAINT "NotificacaoCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
