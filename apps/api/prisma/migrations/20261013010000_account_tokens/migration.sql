ALTER TABLE "Usuario" ADD COLUMN "emailVerificadoEm" TIMESTAMP(3);
CREATE TABLE "TokenConta" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "finalidade" TEXT NOT NULL,
  "digest" TEXT NOT NULL,
  "tokenVersion" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TokenConta_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TokenConta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TokenConta_digest_key" ON "TokenConta"("digest");
CREATE INDEX "TokenConta_usuarioId_finalidade_createdAt_idx" ON "TokenConta"("usuarioId", "finalidade", "createdAt");
CREATE INDEX "TokenConta_expiresAt_id_idx" ON "TokenConta"("expiresAt", "id");
