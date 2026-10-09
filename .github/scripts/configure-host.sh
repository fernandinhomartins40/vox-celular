#!/usr/bin/env bash
# Only this application's virtual host is managed. Host packages must preexist.
set -euo pipefail
: "${APP_ROOT:?}" "${RELEASE:?}" "${DEPLOY_PORT:?}"
[[ "$APP_ROOT" == /opt/voxcelular && "$DEPLOY_PORT" =~ ^[0-9]+$ ]] || exit 1
site=/etc/nginx/sites-available/voxcelular
link=/etc/nginx/sites-enabled/voxcelular
for tool in nginx certbot curl; do command -v "$tool" >/dev/null; done
# Refuse to overwrite a virtual host of unknown ownership.
if [[ -f "$site" ]] && ! grep -q '^# Managed by Vox Celular workflow$' "$site"; then
  echo 'Existing Vox virtual host has unknown ownership. Review before replacing.' >&2; exit 1
fi
if [[ -e "$link" || -L "$link" ]]; then
  [[ $(readlink -f "$link") == "$site" ]] || exit 1
fi
# Check only active host configurations for duplicate Vox domains.
if grep -RlE 'server_name[^;]*(^|[[:space:]])(www\.)?voxcelular\.com\.br([[:space:];]|$)' /etc/nginx/sites-enabled 2>/dev/null | grep -vFx "$link" | grep -q .; then
  echo 'Vox domain appears in another active Nginx site.' >&2; exit 1
fi
mkdir -p /var/www/voxcelular-acme "$APP_ROOT/backups/$RELEASE"
# ACME tokens are public and must be traversable by Nginx workers even when
# the deploy process uses umask 077 to protect application secrets/backups.
chmod 755 /var/www/voxcelular-acme
old="$APP_ROOT/backups/$RELEASE/nginx.conf"
had_old=0
[[ ! -f "$site" ]] || { cp -p "$site" "$old"; had_old=1; }
had_link=0
[[ ! -L "$link" ]] || had_link=1
restore() {
  if [[ "$had_old" == 1 ]]; then cp -p "$old" "$site"; else rm -f -- "$site"; fi
  if [[ "$had_link" == 0 ]]; then rm -f -- "$link"; fi
  nginx -t && systemctl reload nginx
}
on_failure() {
  local status=$?
  trap - ERR
  restore
  exit "$status"
}
trap on_failure ERR
if [[ ! -f /etc/letsencrypt/live/voxcelular.com.br/fullchain.pem ]]; then
  # First deployment only: serve ACME, without exposing app credentials over HTTP.
  cat > "$site" <<EOF
# Managed by Vox Celular workflow
server {
    listen 80;
    server_name voxcelular.com.br www.voxcelular.com.br;
    location /.well-known/acme-challenge/ { root /var/www/voxcelular-acme; }
    location / { return 503; }
}
EOF
  ln -sfn "$site" "$link"
  nginx -t
  systemctl reload nginx
  certbot certonly --webroot -w /var/www/voxcelular-acme -d voxcelular.com.br -d www.voxcelular.com.br \
    --email admin@voxcelular.com.br --agree-tos --non-interactive
fi
cat > "$site" <<EOF
# Managed by Vox Celular workflow
server {
    listen 80;
    server_name voxcelular.com.br www.voxcelular.com.br;
    location /.well-known/acme-challenge/ { root /var/www/voxcelular-acme; }
    location / { return 301 https://www.voxcelular.com.br\$request_uri; }
}
server {
    listen 443 ssl;
    server_name voxcelular.com.br www.voxcelular.com.br;
    ssl_certificate /etc/letsencrypt/live/voxcelular.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/voxcelular.com.br/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    client_max_body_size 10M;
    location / {
        proxy_pass http://127.0.0.1:$DEPLOY_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
ln -sfn "$site" "$link"
nginx -t
systemctl reload nginx
curl --fail --silent --show-error --resolve "www.voxcelular.com.br:443:127.0.0.1" --max-time 15 \
  https://www.voxcelular.com.br/api/ready >/dev/null
trap - ERR
