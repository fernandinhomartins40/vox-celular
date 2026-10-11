#!/usr/bin/env bash
# GitHub Actions only. Inputs are non-secret environment values; registry token is stdin.
set -Eeuo pipefail
umask 077
: "${APP_ROOT:?}" "${RELEASE:?}" "${DEPLOY_PORT:?}" "${GHCR_USER:?}"
[[ "$APP_ROOT" == /opt/voxcelular && "$RELEASE" =~ ^[a-f0-9]{40}-[0-9]+-[0-9]+$ ]] || exit 1
[[ "$DEPLOY_PORT" =~ ^[0-9]+$ ]] && (( DEPLOY_PORT >= 1024 && DEPLOY_PORT <= 65535 )) || exit 1
for name in vox_db vox_api vox_web; do
  if docker inspect "$name" >/dev/null 2>&1; then
    [[ $(docker inspect "$name" --format '{{index .Config.Labels "com.docker.compose.project"}}') == voxcelular ]] || {
      echo "Container $name has unknown ownership." >&2; exit 1;
    }
  fi
done
RELEASE_DIR="$APP_ROOT/releases/$RELEASE"
ENV_FILE="$APP_ROOT/.env"
mkdir -p "$APP_ROOT/backups"
exec 9>"$APP_ROOT/deploy.lock"
flock -n 9 || { echo 'Another Vox deployment is running.' >&2; exit 1; }
for tool in docker curl openssl tar ss; do command -v "$tool" >/dev/null; done
docker compose version >/dev/null
# Refuse to displace another application or host listener.
if ss -H -lnt "sport = :$DEPLOY_PORT" | grep -q .; then
  own_port=$(docker inspect vox_web --format '{{range (index .NetworkSettings.Ports "80/tcp")}}{{.HostPort}}{{end}}' 2>/dev/null || true)
  [[ "$own_port" == "$DEPLOY_PORT" ]] || { echo "Port $DEPLOY_PORT is already in use by another service." >&2; exit 1; }
fi

[[ -f "$RELEASE_DIR/release.env" && -f "$RELEASE_DIR/docker-compose.yml" ]] || exit 1
# Validate the uploaded immutable image manifest before sourcing it.
[[ $(wc -l < "$RELEASE_DIR/release.env") -eq 3 ]] || exit 1
while IFS= read -r line; do
  [[ "$line" =~ ^(API_IMAGE|WEB_IMAGE|MIGRATION_IMAGE)=ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$ ]] || exit 1
done < "$RELEASE_DIR/release.env"
set -a
source "$RELEASE_DIR/release.env"
set +a
for key in API_IMAGE WEB_IMAGE MIGRATION_IMAGE; do [[ -n "${!key:-}" ]] || exit 1; done

# Credentials are limited to this deploy and never printed/persisted in app files.
DOCKER_CONFIG=$(mktemp -d /tmp/voxcelular-registry.XXXXXX)
export DOCKER_CONFIG
cleanup() { rm -rf -- "$DOCKER_CONFIG"; }
trap cleanup EXIT
IFS= read -r registry_token
printf '%s' "$registry_token" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
unset registry_token

# Create secrets exactly once. Preserve every existing value on later deployments.
if [[ ! -f "$ENV_FILE" ]]; then
  if docker volume inspect voxcelular_pgdata >/dev/null 2>&1; then
    echo 'Persistent database exists without .env. Restore original credentials before deploying.' >&2
    exit 1
  fi
  database_password=$(openssl rand -hex 32)
  jwt_secret=$(openssl rand -hex 32)
  admin_password=$(openssl rand -hex 24)
  env_tmp=$(mktemp "$APP_ROOT/.env.XXXXXX")
  printf 'POSTGRES_PASSWORD=%s\nJWT_SECRET=%s\nADMIN_EMAIL=lojista@vox.com\nADMIN_PASSWORD=%s\nCORS_ORIGIN=https://www.voxcelular.com.br\n' \
    "$database_password" "$jwt_secret" "$admin_password" > "$env_tmp"
  chmod 600 "$env_tmp"
  mv -T "$env_tmp" "$ENV_FILE"
  unset database_password jwt_secret admin_password
fi
chmod 600 "$ENV_FILE"
export DEPLOY_PORT
compose() { docker compose --project-name voxcelular --file "$RELEASE_DIR/docker-compose.yml" --env-file "$ENV_FILE" "$@"; }
compose config --quiet
# Pull sequentially to reduce network/decompression pressure on this shared host.
export COMPOSE_PARALLEL_LIMIT=1
compose --profile tools pull db api web migrate
previous=$(readlink -f "$APP_ROOT/current" 2>/dev/null || true)
if [[ -e "$APP_ROOT/current" || -L "$APP_ROOT/current" ]]; then
  [[ "$previous" == "$APP_ROOT/releases/"* ]] || { echo 'Unknown current release path.' >&2; exit 1; }
fi

# Back up the existing database and uploads BEFORE migrations; failures abort deploy.
backup="$APP_ROOT/backups/$RELEASE"
backup_current() {
  mkdir -p "$backup"
  docker exec vox_db pg_dump -U vox -d voxcelular -Fc > "$backup/database.dump.partial"
  docker exec -i vox_db pg_restore --list < "$backup/database.dump.partial" >/dev/null
  mv "$backup/database.dump.partial" "$backup/database.dump"
  if docker volume inspect voxcelular_uploads >/dev/null 2>&1; then
    docker run --rm --network none --memory 64m --cpus 0.5 --mount type=volume,source=voxcelular_uploads,target=/uploads,readonly \
      --entrypoint tar "$WEB_IMAGE" -czf - -C /uploads . > "$backup/uploads.tar.gz.partial"
    tar -tzf "$backup/uploads.tar.gz.partial" >/dev/null
    mv "$backup/uploads.tar.gz.partial" "$backup/uploads.tar.gz"
  fi
}
if docker inspect vox_db >/dev/null 2>&1; then
  [[ $(docker inspect vox_db --format '{{.State.Running}}') == true ]] || { echo 'Existing database must be running for backup.' >&2; exit 1; }
  backup_current
fi
compose up -d --no-build --wait --wait-timeout 120 db
# A retained volume can exist even when its old container has been removed.
# Always cover that case before applying migrations.
if [[ ! -f "$backup/database.dump" ]]; then
  backup_current
fi
# Migration is serialized and is NOT repeated on API startup.
compose --profile tools run --rm --no-deps migrate
lojas=$(docker exec vox_db psql -U vox -d voxcelular -tAc 'SELECT COUNT(*) FROM "Loja";')
if [[ "$lojas" == 0 ]]; then
  # Secret is read by psql-independent bootstrap; never emit it into the job logs.
  ADMIN_EMAIL=$(sed -n 's/^ADMIN_EMAIL=//p' "$ENV_FILE")
  ADMIN_PASSWORD=$(sed -n 's/^ADMIN_PASSWORD=//p' "$ENV_FILE")
  [[ -n "$ADMIN_EMAIL" && ${#ADMIN_PASSWORD} -ge 12 ]] || { echo 'Initialization credentials missing in app .env.' >&2; exit 1; }
  export ADMIN_EMAIL ADMIN_PASSWORD
  compose --profile tools run --rm --no-deps -e ADMIN_EMAIL -e ADMIN_PASSWORD migrate node dist/bootstrap.js
  unset ADMIN_EMAIL ADMIN_PASSWORD
fi
rollback() {
  local failed=$?
  trap - ERR
  if [[ -n "$previous" && -f "$previous/release.env" ]]; then
    echo 'New release failed. Restoring previous application images (database is not reverted).'
    set -a; source "$previous/release.env"; set +a
    docker compose --project-name voxcelular --file "$previous/docker-compose.yml" --env-file "$ENV_FILE" \
      up -d --no-build --wait --wait-timeout 120 api web || true
  else
    echo 'First deployment failed; persistent data is retained for diagnosis.' >&2
  fi
  exit "$failed"
}
# Safe for the additive migration in this repository. Breaking future migrations
# require an explicit compatibility/restore plan before image rollback is enabled.
trap rollback ERR
compose up -d --no-build --wait --wait-timeout 180 api web
APP_ROOT="$APP_ROOT" RELEASE="$RELEASE" DEPLOY_PORT="$DEPLOY_PORT" bash "$RELEASE_DIR/.github/scripts/remote-health-check.sh"
APP_ROOT="$APP_ROOT" RELEASE="$RELEASE" DEPLOY_PORT="$DEPLOY_PORT" bash "$RELEASE_DIR/.github/scripts/configure-host.sh"
ln -sfn "$RELEASE_DIR" "$APP_ROOT/current"
trap - ERR
printf 'Release %s healthy. No images, backups or persistent volumes were pruned.\n' "$RELEASE"
if [[ "${CREATE_TEST_ADMIN:-false}" == true ]]; then
  access_file="$APP_ROOT/test-admin.env"
  if [[ ! -f "$access_file" ]]; then
    access_tmp=$(mktemp "$APP_ROOT/test-admin.env.XXXXXX")
    printf 'TEST_ADMIN_EMAIL=teste.lojista@voxcelular.com.br\nTEST_ADMIN_PASSWORD=%s\n' "$(openssl rand -hex 18)" > "$access_tmp"
    chmod 600 "$access_tmp"
    mv -T "$access_tmp" "$access_file"
  fi
  set -a; source "$access_file"; set +a
  ALLOW_TEST_ADMIN_SEED=true
  export ALLOW_TEST_ADMIN_SEED
  compose --profile tools run --rm --no-deps -e TEST_ADMIN_EMAIL -e TEST_ADMIN_PASSWORD -e ALLOW_TEST_ADMIN_SEED migrate node dist/seed.js
  unset TEST_ADMIN_EMAIL TEST_ADMIN_PASSWORD ALLOW_TEST_ADMIN_SEED
fi
if [[ "${SEED_DEMO_DATA:-false}" == true ]]; then
  access_file="$APP_ROOT/test-customer.env"
  if [[ ! -f "$access_file" ]]; then
    access_tmp=$(mktemp "$APP_ROOT/test-customer.env.XXXXXX")
    printf 'TEST_CUSTOMER_PASSWORD=%s\n' "$(openssl rand -hex 18)" > "$access_tmp"
    chmod 600 "$access_tmp"
    mv -T "$access_tmp" "$access_file"
  fi
  set -a; source "$access_file"; set +a
  ALLOW_DEMO_SEED=true
  export ALLOW_DEMO_SEED
  compose --profile tools run --rm --no-deps -e TEST_CUSTOMER_PASSWORD -e ALLOW_DEMO_SEED migrate node dist/seed-demo.js
  unset TEST_CUSTOMER_PASSWORD ALLOW_DEMO_SEED
fi

if [[ "${PUBLISH_DEMO_CATALOG:-false}" == true ]]; then
  compose --profile tools run --rm --no-deps -e ALLOW_PRESENTATION_SEED=true migrate node dist/seed-presentation.js
fi
