ALTER TABLE "Produto" ADD COLUMN "atributosTecnicos" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Produto" ADD COLUMN "atributosVerificadosEm" TIMESTAMP(3);
