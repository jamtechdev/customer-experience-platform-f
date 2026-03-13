#!/bin/bash
# Frontend deploy - run from frontend repo root
# Usage: ./deploy.sh [DEST] [--pull]
#   DEST     web root to deploy to (e.g. /var/www). Use env WEB_ROOT if not passed.
#   --pull   run git pull before building and deploying
#
# Example: ./deploy.sh /var/www
#          WEB_ROOT=/var/www ./deploy.sh --pull

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

DEST=""
PULL=""
for arg in "$@"; do
  if [[ "$arg" == "--pull" ]]; then
    PULL=1
  elif [[ -z "$DEST" && -n "$arg" ]]; then
    DEST="$arg"
  fi
done
[[ -z "$DEST" ]] && DEST="${WEB_ROOT:-}"

if [[ -n "$PULL" ]]; then
  echo ">>> Git pull..."
  git pull
fi

echo ">>> Install & build..."
npm ci
npm run build

DIST="$ROOT/dist/sentimenter-cx/browser"
if [[ ! -d "$DIST" ]]; then
  echo "Error: Build output not found at $DIST"
  exit 1
fi

if [[ -z "$DEST" ]]; then
  echo ">>> Build done. Set WEB_ROOT or pass DEST to copy files (e.g. ./deploy.sh /var/www)"
  exit 0
fi

echo ">>> Deploy to $DEST..."
rsync -av --delete "$DIST/" "$DEST/"

echo ">>> Frontend deploy done."
