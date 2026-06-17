#!/usr/bin/env bash
set -euo pipefail

# Frontend production deploy — run from frontend repo on the server.
#
#   cd /var/www/customer-experience-platform-f
#   npm run deploy
#
# Optional env:
#   WEB_ROOT=/var/www/html          nginx static root (default)
#   SKIP_GIT_PULL=1                 skip git pull

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_ROOT="${WEB_ROOT:-/var/www/html}"
BROWSER_DIST="dist/sentimenter-cx/browser"

step() { printf '\n▶ %s\n' "$*"; }

cd "$ROOT"

if [[ "${SKIP_GIT_PULL:-}" != "1" ]]; then
  step "git pull"
  git pull
fi

step "npm ci"
npm ci

step "npm run build"
npm run build

[[ -d "$BROWSER_DIST" ]] || {
  echo "ERROR: build output missing: ${ROOT}/${BROWSER_DIST}" >&2
  exit 1
}

step "rsync → ${WEB_ROOT}"
sudo rsync -a --delete "${BROWSER_DIST}/" "${WEB_ROOT}/"

step "nginx test + reload"
sudo nginx -t
sudo systemctl reload nginx

printf '\n✔ Frontend deploy complete (%s → %s)\n' "$ROOT" "$WEB_ROOT"
