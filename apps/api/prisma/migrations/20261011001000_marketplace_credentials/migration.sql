CREATE TABLE "IntegracaoMarketplace" (
 "id" TEXT NOT NULL, "lojaId" TEXT NOT NULL, "canal" TEXT NOT NULL,
 "ambiente" TEXT NOT NULL DEFAULT 'producao', "credenciais" TEXT NOT NULL,
 "campos" TEXT[] NOT NULL, "status" TEXT NOT NULL DEFAULT 'CONFIGURADO',
 "verificadoEm" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "IntegracaoMarketplace_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "IntegracaoMarketplace_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "IntegracaoMarketplace_lojaId_canal_key" ON "IntegracaoMarketplace"("lojaId", "canal");
