-- CreateTable
CREATE TABLE "EntregaPush" (
    "id" TEXT NOT NULL,
    "notificacaoId" TEXT NOT NULL,
    "assinaturaId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "proximaTentativaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmadaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntregaPush_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntregaPush_status_proximaTentativaEm_idx" ON "EntregaPush"("status", "proximaTentativaEm");

-- CreateIndex
CREATE UNIQUE INDEX "EntregaPush_notificacaoId_assinaturaId_key" ON "EntregaPush"("notificacaoId", "assinaturaId");

-- AddForeignKey
ALTER TABLE "EntregaPush" ADD CONSTRAINT "EntregaPush_notificacaoId_fkey" FOREIGN KEY ("notificacaoId") REFERENCES "NotificacaoCliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaPush" ADD CONSTRAINT "EntregaPush_assinaturaId_fkey" FOREIGN KEY ("assinaturaId") REFERENCES "AssinaturaPush"("id") ON DELETE CASCADE ON UPDATE CASCADE;
