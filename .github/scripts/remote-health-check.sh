#!/usr/bin/env bash
set -euo pipefail
: "${APP_ROOT:?}" "${RELEASE:?}" "${DEPLOY_PORT:?}"
for name in vox_db vox_api vox_web; do
  [[ $(docker inspect "$name" --format '{{.State.Status}}') == running ]]
  [[ $(docker inspect "$name" --format '{{.State.Health.Status}}') == healthy ]]
  [[ $(docker inspect "$name" --format '{{.State.OOMKilled}}') == false ]]
done
curl --fail --silent --show-error --max-time 10 "http://127.0.0.1:$DEPLOY_PORT/api/ready" >/dev/null
curl --fail --silent --show-error --max-time 10 "http://127.0.0.1:$DEPLOY_PORT/api/loja" >/dev/null
curl --fail --silent --show-error --max-time 10 "http://127.0.0.1:$DEPLOY_PORT/" | grep -qi '<!doctype html>'
curl --fail --silent --show-error --max-time 10 "http://127.0.0.1:$DEPLOY_PORT/admin/login" | grep -qi '<!doctype html>'
docker exec vox_db psql -U vox -d voxcelular -tAc 'SELECT 1' | grep -qx 1
docker stats --no-stream --format '{{.Name}} {{.CPUPerc}} {{.MemUsage}}' vox_db vox_api vox_web
printf 'Application readiness, SPA and database validated.\n'
