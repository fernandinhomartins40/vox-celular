CREATE TABLE "Favorito" (
  "clienteId" TEXT NOT NULL,
  "produtoId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Favorito_pkey" PRIMARY KEY ("clienteId", "produtoId"),
  CONSTRAINT "Favorito_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Favorito_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Favorito_produtoId_idx" ON "Favorito"("produtoId");
