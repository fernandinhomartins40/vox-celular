CREATE TABLE "Novidade" (
 "id" TEXT NOT NULL PRIMARY KEY, "lojaId" TEXT NOT NULL, "titulo" TEXT NOT NULL,
 "resumo" TEXT NOT NULL, "texto" TEXT NOT NULL, "fonte" TEXT NOT NULL,
 "publicado" BOOLEAN NOT NULL DEFAULT false, "revisadoEm" TIMESTAMP(3) NOT NULL,
 "validoAte" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Novidade_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Novidade_lojaId_publicado_validoAte_idx" ON "Novidade"("lojaId", "publicado", "validoAte");
