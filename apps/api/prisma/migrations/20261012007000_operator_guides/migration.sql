-- CreateTable
CREATE TABLE "GuiaOperadora" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "operadora" TEXT NOT NULL,
    "topico" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "resumo" TEXT NOT NULL,
    "passos" TEXT[],
    "fonte" TEXT NOT NULL,
    "canalOficial" TEXT NOT NULL,
    "revisadoEm" TIMESTAMP(3) NOT NULL,
    "validoAte" TIMESTAMP(3) NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuiaOperadora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuiaOperadora_lojaId_operadora_publicado_validoAte_idx" ON "GuiaOperadora"("lojaId", "operadora", "publicado", "validoAte");

-- AddForeignKey
ALTER TABLE "GuiaOperadora" ADD CONSTRAINT "GuiaOperadora_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
