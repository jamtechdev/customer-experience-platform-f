#!/usr/bin/env bash
# Clears old build and creates a new production build.
# Usage: ./scripts/build-clean.sh   or   npm run build:clean

set -e
cd "$(dirname "$0")/.."

echo "Removing old build (dist/)..."
rm -rf dist

echo "Building production bundle..."
npm run build

echo "Done. Output in dist/"
