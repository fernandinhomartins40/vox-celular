CREATE TABLE "CompatibilidadeProduto" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "acessorioId" TEXT NOT NULL,
  "aparelhoId" TEXT NOT NULL,
  "observacao" TEXT NOT NULL,
  "aprovadoPorId" TEXT NOT NULL,
  "aprovadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompatibilidadeProduto_acessorioId_fkey" FOREIGN KEY ("acessorioId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CompatibilidadeProduto_aparelhoId_fkey" FOREIGN KEY ("aparelhoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CompatibilidadeProduto_aprovadoPorId_fkey" FOREIGN KEY ("aprovadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CompatibilidadeProduto_acessorioId_aparelhoId_key" ON "CompatibilidadeProduto"("acessorioId", "aparelhoId");
CREATE INDEX "CompatibilidadeProduto_aparelhoId_idx" ON "CompatibilidadeProduto"("aparelhoId");
