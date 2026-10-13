CREATE TABLE "OrcamentoServico" (
 "id" TEXT NOT NULL PRIMARY KEY, "solicitacaoId" TEXT NOT NULL, "versao" INTEGER NOT NULL,
 "valorCentavos" INTEGER NOT NULL, "descricao" TEXT NOT NULL, "validoAte" TIMESTAMP(3) NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDENTE', "decididoEm" TIMESTAMP(3), "emitidoPorId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "OrcamentoServico_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "SolicitacaoServico"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "OrcamentoServico_emitidoPorId_fkey" FOREIGN KEY ("emitidoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OrcamentoServico_solicitacaoId_versao_key" ON "OrcamentoServico"("solicitacaoId", "versao");
