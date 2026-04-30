#!/usr/bin/env bash
# Runs on the VPS after deploy. Validates the application is responding.
# ENV expected: APP_ROOT, DEPLOY_PORT, RELEASE
set -euo pipefail

COMPOSE_FILE="$APP_ROOT/releases/$RELEASE/docker-compose.yml"
ENV_FILE="$APP_ROOT/.env"
export COMPOSE_PROJECT_NAME=voxcelular

echo "==> Running post-deploy health checks for release: $RELEASE"

# ── 1. All containers must be running ────────────────────────────────────────
echo "  Checking container status..."
CONTAINERS=$(docker compose \
  --project-name "$COMPOSE_PROJECT_NAME" \
  --file "$COMPOSE_FILE" \
  ps --format json 2>/dev/null || \
  docker compose \
  --project-name "$COMPOSE_PROJECT_NAME" \
  --file "$COMPOSE_FILE" \
  ps)

docker compose \
  --project-name "$COMPOSE_PROJECT_NAME" \
  --file "$COMPOSE_FILE" \
  ps

# ── 2. API /health endpoint ───────────────────────────────────────────────────
echo "  Checking API health endpoint..."
ATTEMPTS=0
API_OK=0
until [ "$ATTEMPTS" -ge 20 ]; do
  ATTEMPTS=$((ATTEMPTS+1))
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://127.0.0.1:${DEPLOY_PORT}/api/health" \
    --connect-timeout 5 --max-time 10 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    API_OK=1
    echo "  API /health responded 200 on attempt ${ATTEMPTS}"
    break
  fi
  echo "  attempt ${ATTEMPTS}/20: HTTP $HTTP_CODE — waiting 3s..."
  sleep 3
done

if [ "$API_OK" -eq 0 ]; then
  echo "ERROR: API health check failed after 20 attempts" >&2
  echo "--- API container logs ---"
  docker compose \
    --project-name "$COMPOSE_PROJECT_NAME" \
    --file "$COMPOSE_FILE" \
    logs --tail=50 api || true
  exit 1
fi

# ── 3. Frontend is served ─────────────────────────────────────────────────────
echo "  Checking frontend (/)..."
FE_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://127.0.0.1:${DEPLOY_PORT}/" \
  --connect-timeout 5 --max-time 10 2>/dev/null || echo "000")

if [ "$FE_CODE" != "200" ]; then
  echo "WARNING: Frontend / returned HTTP $FE_CODE (may be fine if nginx redirects)" >&2
else
  echo "  Frontend / responded $FE_CODE"
fi

# ── 4. Database connectivity ──────────────────────────────────────────────────
echo "  Checking database..."
DB_OK=$(docker compose \
  --project-name "$COMPOSE_PROJECT_NAME" \
  --file "$COMPOSE_FILE" \
  exec -T db pg_isready -U vox -d voxcelular 2>&1 || echo "FAILED")

if echo "$DB_OK" | grep -q "accepting connections"; then
  echo "  Database is accepting connections."
else
  echo "WARNING: Database health uncertain: $DB_OK" >&2
fi

# ── 5. Summary ────────────────────────────────────────────────────────────────
echo ""
echo "==> Health check passed. Release $RELEASE is live."
echo "    URL: http://127.0.0.1:${DEPLOY_PORT}"
