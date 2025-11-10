#!/usr/bin/env bash
set -e

# Force npm to install optional deps (Rollup binary)
echo "optional=false" > .npmrc

# Fresh install
rm -rf node_modules package-lock.json
npm install

# Ensure vite binary has execute permission
chmod +x node_modules/.bin/vite

# Build project
npm run build
