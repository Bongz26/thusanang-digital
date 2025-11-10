#!/usr/bin/env bash
set -e

# Force optional dependencies
echo "optional=false" > .npmrc

# Clean install
rm -rf node_modules package-lock.json
npm install

# Fix Vite CLI permission
chmod +x node_modules/.bin/vite

# Run Vite build directly (NOT npm run build!)
node node_modules/vite/bin/vite.js build
