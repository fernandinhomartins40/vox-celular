-- CreateTable
CREATE TABLE "OrcamentoIa" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "limiteMicroUsd" BIGINT NOT NULL,
    "gastoMicroUsd" BIGINT NOT NULL DEFAULT 0,
    "reservadoMicroUsd" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrcamentoIa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservaIa" (
    "id" TEXT NOT NULL,
    "orcamentoId" TEXT NOT NULL,
    "valorMicroUsd" BIGINT NOT NULL,
    "custoMicroUsd" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'RESERVADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerradaEm" TIMESTAMP(3),

    CONSTRAINT "ReservaIa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrcamentoIa_lojaId_mes_key" ON "OrcamentoIa"("lojaId", "mes");

-- CreateIndex
CREATE INDEX "ReservaIa_orcamentoId_status_idx" ON "ReservaIa"("orcamentoId", "status");

-- AddForeignKey
ALTER TABLE "OrcamentoIa" ADD CONSTRAINT "OrcamentoIa_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservaIa" ADD CONSTRAINT "ReservaIa_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "OrcamentoIa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
