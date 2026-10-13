ALTER TABLE "Novidade" ADD COLUMN "revisadoPorId" TEXT;
ALTER TABLE "Novidade" ADD CONSTRAINT "Novidade_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
