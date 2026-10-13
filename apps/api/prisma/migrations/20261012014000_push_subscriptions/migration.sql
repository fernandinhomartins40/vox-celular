-- CreateTable
CREATE TABLE "AssinaturaPush" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "endpointHash" TEXT NOT NULL,
    "credenciais" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssinaturaPush_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssinaturaPush_endpointHash_key" ON "AssinaturaPush"("endpointHash");

-- CreateIndex
CREATE INDEX "AssinaturaPush_clienteId_ativo_idx" ON "AssinaturaPush"("clienteId", "ativo");

-- AddForeignKey
ALTER TABLE "AssinaturaPush" ADD CONSTRAINT "AssinaturaPush_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
