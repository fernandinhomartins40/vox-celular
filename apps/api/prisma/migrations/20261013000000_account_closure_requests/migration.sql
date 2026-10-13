CREATE TABLE "SolicitacaoEncerramentoConta" (
  "id" TEXT NOT NULL,
  "clienteId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SOLICITADA',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SolicitacaoEncerramentoConta_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SolicitacaoEncerramentoConta_clienteId_key" ON "SolicitacaoEncerramentoConta"("clienteId");
ALTER TABLE "SolicitacaoEncerramentoConta" ADD CONSTRAINT "SolicitacaoEncerramentoConta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
