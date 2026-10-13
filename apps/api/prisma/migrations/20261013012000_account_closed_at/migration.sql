ALTER TABLE "Usuario" ADD COLUMN "encerradaEm" TIMESTAMP(3);

CREATE FUNCTION vox_guard_closed_customer_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE closed_at timestamp;
BEGIN
  SELECT u."encerradaEm" INTO closed_at
  FROM "Cliente" c JOIN "Usuario" u ON u.id = c."usuarioId"
  WHERE c.id = NEW."clienteId" FOR SHARE OF u;
  IF closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'account closed' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER vox_guard_closed_order BEFORE INSERT ON "Pedido" FOR EACH ROW EXECUTE FUNCTION vox_guard_closed_customer_write();
CREATE TRIGGER vox_guard_closed_service BEFORE INSERT ON "SolicitacaoServico" FOR EACH ROW EXECUTE FUNCTION vox_guard_closed_customer_write();
CREATE TRIGGER vox_guard_closed_reward BEFORE INSERT ON "ResgateRecompensa" FOR EACH ROW EXECUTE FUNCTION vox_guard_closed_customer_write();
