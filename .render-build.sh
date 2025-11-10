#!/usr/bin/env bash
set -e

# fresh install
rm -rf node_modules package-lock.json
npm install

# ensure vite binary has execute permission
chmod +x node_modules/vite/bin/vite.js

# build project
npm run build
