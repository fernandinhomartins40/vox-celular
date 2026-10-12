ALTER TABLE "Sessao" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Sessao_usuarioId_expiresAt_idx" ON "Sessao"("usuarioId", "expiresAt");
