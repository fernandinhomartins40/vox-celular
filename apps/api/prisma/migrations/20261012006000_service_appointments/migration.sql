-- AlterTable
ALTER TABLE "Servico" ADD COLUMN     "agendamento" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SolicitacaoServico" ADD COLUMN     "horarioId" TEXT;

-- CreateTable
CREATE TABLE "HorarioServico" (
    "id" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "capacidade" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HorarioServico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HorarioServico_servicoId_inicio_ativo_idx" ON "HorarioServico"("servicoId", "inicio", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "HorarioServico_servicoId_inicio_key" ON "HorarioServico"("servicoId", "inicio");

-- CreateIndex
CREATE INDEX "SolicitacaoServico_horarioId_status_idx" ON "SolicitacaoServico"("horarioId", "status");

-- AddForeignKey
ALTER TABLE "SolicitacaoServico" ADD CONSTRAINT "SolicitacaoServico_horarioId_fkey" FOREIGN KEY ("horarioId") REFERENCES "HorarioServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioServico" ADD CONSTRAINT "HorarioServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
