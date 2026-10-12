ALTER TABLE "ResgateRecompensa" ADD COLUMN "chaveResgate" TEXT;
CREATE UNIQUE INDEX "ResgateRecompensa_clienteId_chaveResgate_key" ON "ResgateRecompensa"("clienteId", "chaveResgate");
