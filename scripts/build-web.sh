#!/usr/bin/env bash
# Builds the website Cloudflare Pages publishes (portal.skwydhub.com and order.skwydhub.com).
# The POS, Team, Driver and Insights apps ship as Android apps (GitHub workflows pos-rn and team-rn); the POS web copy is at /pos-app/ for dev.pos.skwydhub.com.
set -euo pipefail
rm -rf web && mkdir -p web
# the ordering page's dark theme: rebuilt from its own styles (the committed copy is used if python3 is missing)
if command -v python3 >/dev/null 2>&1; then python3 scripts/gen-dark.py order.html theme-dark-order.css apple || true; fi
# online ordering (order.skwydhub.com), order tracking, the signup page, and the shared files they and the back office load
cp order.html signup.html track.html orderv3.js modpick.js ioskit.js ioskit.css theme-dark-order.css invoice-doc.js sw.js web/
cp skwyd-icon-32.png skwyd-icon-180.png skwyd-icon-512.png web/
cp cloudflare/_redirects cloudflare/_headers web/
echo "Built web/: $(ls web | tr '\n' ' ')"
# the back office (React, Tremor look) is the site's home page; the old /v2/ address redirects here
(cd ta && npm ci --no-audit --no-fund && SKWYD_BASE=/ npx vite build) && cp -r ta/dist/. web/ && echo "Built the back office (React) at /"
# the new POS (React Native, apps/pos) as a web app at /pos-app/ (dev.pos.skwydhub.com opens it); if it can't build, the rest of the site still publishes.
# Cloudflare Pages doesn't publish folders named node_modules, so the fonts Expo puts in assets/node_modules move to assets/nm.
(cd apps/pos && npm ci --no-audit --no-fund && EXPO_NO_TELEMETRY=1 SKWYD_WEB_BASE=/pos-app npx expo export -p web --output-dir ../../web/pos-app \
  && mv ../../web/pos-app/assets/node_modules ../../web/pos-app/assets/nm && grep -rl "assets/node_modules/" ../../web/pos-app | xargs -r sed -i "s#assets/node_modules/#assets/nm/#g" \
  && echo "Built the POS web app at /pos-app/") || echo "The POS web app didn't build; skipped"
