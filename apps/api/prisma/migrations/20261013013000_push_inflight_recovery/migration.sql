ALTER TABLE "EntregaPush" ADD COLUMN "processandoDesde" TIMESTAMP(3);
UPDATE "EntregaPush" SET "processandoDesde" = CURRENT_TIMESTAMP WHERE status = 'PROCESSANDO';
CREATE INDEX "EntregaPush_status_processandoDesde_idx" ON "EntregaPush"("status", "processandoDesde");
