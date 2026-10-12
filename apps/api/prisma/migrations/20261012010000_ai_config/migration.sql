-- CreateTable
CREATE TABLE "ConfiguracaoIa" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "provedor" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "workspace" TEXT,
    "credenciais" TEXT NOT NULL,
    "limiteMicroUsd" BIGINT NOT NULL,
    "tarifaEntradaMicroUsd" BIGINT NOT NULL,
    "tarifaSaidaMicroUsd" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoIa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracaoIa_lojaId_key" ON "ConfiguracaoIa"("lojaId");

-- AddForeignKey
ALTER TABLE "ConfiguracaoIa" ADD CONSTRAINT "ConfiguracaoIa_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
