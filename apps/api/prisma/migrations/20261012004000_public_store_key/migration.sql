ALTER TABLE "Loja" ADD COLUMN "chavePublica" TEXT;
CREATE UNIQUE INDEX "Loja_chavePublica_key" ON "Loja"("chavePublica");
-- Identify the existing Vox only when its name is unambiguous.
-- Never assign an arbitrary tenant when multiple stores share that name.
UPDATE "Loja" SET "chavePublica" = 'vox-celular'
WHERE nome = 'Vox Celular'
  AND (SELECT count(*) FROM "Loja" WHERE nome = 'Vox Celular') = 1;
