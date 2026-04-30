#!/usr/bin/env bash
# Runs on the VPS. Called by the deploy workflow.
# ENV expected: APP_ROOT, RELEASE, DEPLOY_PORT
set -euo pipefail

RELEASE_DIR="$APP_ROOT/releases/$RELEASE"
CURRENT_LINK="$APP_ROOT/current"
ENV_FILE="$APP_ROOT/.env"
COMPOSE_FILE="$RELEASE_DIR/docker-compose.yml"

echo "==> Starting deploy of release: $RELEASE"

# ── 1. Validate required files ────────────────────────────────────────────────
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "ERROR: docker-compose.yml not found at $COMPOSE_FILE" >&2
  exit 1
fi
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env not found at $ENV_FILE — run the 'Ensure .env' step first" >&2
  exit 1
fi

# ── 2. Patch docker-compose.yml port binding to match DEPLOY_PORT ─────────────
# The repo's docker-compose.yml maps 3096:80. On the VPS nginx handles TLS and
# forwards to DEPLOY_PORT (also 3096). The container's nginx listens on 80.
# We override the published port so the container binds exactly DEPLOY_PORT.
sed -i "s|\"[0-9]*:80\"|\"${DEPLOY_PORT}:80\"|g" "$COMPOSE_FILE"

# ── 3. Symlink shared .env into release ──────────────────────────────────────
ln -sf "$ENV_FILE" "$RELEASE_DIR/.env"

# ── 4. Preserve persistent volumes across releases ───────────────────────────
# Docker named volumes (pgdata) are independent of the release dir.
# We just need to ensure the project name is stable so volume names don't change.
export COMPOSE_PROJECT_NAME=voxcelular

# ── 5. Pull / build images ────────────────────────────────────────────────────
echo "==> Building images..."
docker compose \
  --project-name "$COMPOSE_PROJECT_NAME" \
  --file "$COMPOSE_FILE" \
  --env-file "$ENV_FILE" \
  build --no-cache

# ── 6. Stop old containers gracefully (keep volumes) ─────────────────────────
echo "==> Stopping previous containers (if any)..."
if [ -L "$CURRENT_LINK" ] && [ -f "$CURRENT_LINK/docker-compose.yml" ]; then
  docker compose \
    --project-name "$COMPOSE_PROJECT_NAME" \
    --file "$CURRENT_LINK/docker-compose.yml" \
    --env-file "$ENV_FILE" \
    down --remove-orphans --timeout 30 || true
fi

# ── 7. Start new containers ───────────────────────────────────────────────────
echo "==> Starting containers..."
docker compose \
  --project-name "$COMPOSE_PROJECT_NAME" \
  --file "$COMPOSE_FILE" \
  --env-file "$ENV_FILE" \
  up -d --remove-orphans

# ── 8. Wait for the DB to be healthy before running migrations ────────────────
echo "==> Waiting for database to be ready..."
WAIT=0
until docker compose \
  --project-name "$COMPOSE_PROJECT_NAME" \
  --file "$COMPOSE_FILE" \
  exec -T db pg_isready -U vox -d voxcelular >/dev/null 2>&1; do
  WAIT=$((WAIT+1))
  if [ "$WAIT" -gt 30 ]; then
    echo "ERROR: Database did not become ready within 60s" >&2
    docker compose \
      --project-name "$COMPOSE_PROJECT_NAME" \
      --file "$COMPOSE_FILE" \
      logs db || true
    exit 1
  fi
  echo "  waiting for db... (${WAIT}/30)"
  sleep 2
done
echo "  database is ready."

# ── 9. Run Prisma migrations ──────────────────────────────────────────────────
echo "==> Running database migrations..."
docker compose \
  --project-name "$COMPOSE_PROJECT_NAME" \
  --file "$COMPOSE_FILE" \
  --env-file "$ENV_FILE" \
  exec -T api npx prisma migrate deploy

# ── 10. Run seed only on first deploy (when Loja table is empty) ──────────────
ROW_COUNT=$(docker compose \
  --project-name "$COMPOSE_PROJECT_NAME" \
  --file "$COMPOSE_FILE" \
  exec -T db psql -U vox -d voxcelular -tAc \
  "SELECT COUNT(*) FROM \"Loja\";" 2>/dev/null || echo "0")
ROW_COUNT=$(echo "$ROW_COUNT" | tr -d '[:space:]')

if [ "${ROW_COUNT:-0}" = "0" ]; then
  echo "==> Running database seed (first deploy)..."
  docker compose \
    --project-name "$COMPOSE_PROJECT_NAME" \
    --file "$COMPOSE_FILE" \
    --env-file "$ENV_FILE" \
    exec -T api node dist/seed.js || \
  docker compose \
    --project-name "$COMPOSE_PROJECT_NAME" \
    --file "$COMPOSE_FILE" \
    --env-file "$ENV_FILE" \
    exec -T api npx tsx src/seed.ts
  echo "  seed complete."
else
  echo "==> Database already seeded (${ROW_COUNT} loja(s) found), skipping seed."
fi

# ── 11. Update current symlink ────────────────────────────────────────────────
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"
echo "==> Symlink updated: $CURRENT_LINK -> $RELEASE_DIR"

# ── 12. Prune old releases (keep last 5) ─────────────────────────────────────
echo "==> Pruning old releases..."
ls -1dt "$APP_ROOT/releases"/*/ 2>/dev/null | tail -n +6 | xargs rm -rf || true

# ── 13. Clean up dangling Docker images ──────────────────────────────────────
docker image prune -f || true

echo "==> Deploy of $RELEASE completed successfully."
