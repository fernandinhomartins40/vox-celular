-- CreateTable
CREATE TABLE "Servico" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "preco" DECIMAL(10,2),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitacaoServico" (
    "id" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "chaveIdempotencia" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "aparelho" TEXT NOT NULL,
    "problema" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEBIDA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitacaoServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoServico" (
    "id" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoServico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Servico_lojaId_ativo_idx" ON "Servico"("lojaId", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitacaoServico_protocolo_key" ON "SolicitacaoServico"("protocolo");

-- CreateIndex
CREATE INDEX "SolicitacaoServico_lojaId_createdAt_idx" ON "SolicitacaoServico"("lojaId", "createdAt");

-- CreateIndex
CREATE INDEX "SolicitacaoServico_clienteId_createdAt_idx" ON "SolicitacaoServico"("clienteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitacaoServico_clienteId_chaveIdempotencia_key" ON "SolicitacaoServico"("clienteId", "chaveIdempotencia");

-- CreateIndex
CREATE INDEX "HistoricoServico_solicitacaoId_createdAt_idx" ON "HistoricoServico"("solicitacaoId", "createdAt");

-- AddForeignKey
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoServico" ADD CONSTRAINT "SolicitacaoServico_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoServico" ADD CONSTRAINT "SolicitacaoServico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoServico" ADD CONSTRAINT "SolicitacaoServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoServico" ADD CONSTRAINT "HistoricoServico_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "SolicitacaoServico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
