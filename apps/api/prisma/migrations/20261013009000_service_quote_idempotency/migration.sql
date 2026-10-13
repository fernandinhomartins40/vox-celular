ALTER TABLE "OrcamentoServico" ADD COLUMN "chaveIdempotencia" TEXT;
CREATE UNIQUE INDEX "OrcamentoServico_solicitacaoId_chaveIdempotencia_key" ON "OrcamentoServico"("solicitacaoId", "chaveIdempotencia");
