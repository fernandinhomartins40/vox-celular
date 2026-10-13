ALTER TABLE "SolicitacaoEncerramentoConta" ADD COLUMN "analiseIniciadaEm" TIMESTAMP(3), ADD COLUMN "analisadoPorId" TEXT;
ALTER TABLE "SolicitacaoEncerramentoConta" ADD CONSTRAINT "SolicitacaoEncerramentoConta_analisadoPorId_fkey" FOREIGN KEY ("analisadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
