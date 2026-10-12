ALTER TABLE "Cliente" ADD COLUMN "personalizacao" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "notificacoes" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "versaoPrivacidade" TEXT,
  ADD COLUMN "preferenciasAtualizadasEm" TIMESTAMP(3);
CREATE TABLE "ConsentimentoCliente" (
  "id" TEXT NOT NULL PRIMARY KEY, "clienteId" TEXT NOT NULL,
  "personalizacao" BOOLEAN NOT NULL, "notificacoes" BOOLEAN NOT NULL,
  "versaoAviso" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsentimentoCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ConsentimentoCliente_clienteId_createdAt_idx" ON "ConsentimentoCliente"("clienteId", "createdAt");
