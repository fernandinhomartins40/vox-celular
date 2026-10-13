CREATE TABLE "ConfiguracaoEmail" (
  "id" TEXT NOT NULL,
  "lojaId" TEXT NOT NULL,
  "credenciais" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConfiguracaoEmail_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ConfiguracaoEmail_lojaId_key" ON "ConfiguracaoEmail"("lojaId");
ALTER TABLE "ConfiguracaoEmail" ADD CONSTRAINT "ConfiguracaoEmail_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
