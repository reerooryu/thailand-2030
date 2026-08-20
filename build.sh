#!/usr/bin/env bash
# Build the playable game. Three steps, in order — each depends on the last.
set -euo pipefail
cd "$(dirname "$0")"

command -v python3 >/dev/null || { echo "python3 required"; exit 1; }
[ -d engine/node_modules ] || (echo "installing engine deps…"; npm --prefix engine install --silent)

# 1. Inline the JSON configs into a TypeScript module the browser bundle can see.
python3 scripts/build_ui_data.py

# 2. Bundle the engine into an IIFE the page can load without a module server.
npx --prefix engine esbuild engine/src/browser.ts \
    --bundle --format=iife --global-name=THAI --outfile=ui/engine.js

# 3. Inline engine + app + css (+ audio, if present) into one distributable file.
python3 scripts/bundle_ui.py

echo
echo "Open ui/thailand-2030.html in a browser. That file is the whole game."
