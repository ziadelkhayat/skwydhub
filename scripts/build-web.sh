#!/usr/bin/env bash
# Builds the website Cloudflare Pages publishes (portal.skwydhub.com and order.skwydhub.com).
# The POS ships as an Android app (built by the GitHub workflow); a test copy is served only on dev.pos.skwydhub.com.
set -euo pipefail
rm -rf web && mkdir -p web
# dark theme: rebuilt from the pages' own styles so new screens get it too (the committed copies are used if python3 is missing)
if command -v python3 >/dev/null 2>&1; then python3 scripts/gen-dark.py index.html theme-dark.css && python3 scripts/gen-dark.py hub.html theme-dark-hub.css && python3 scripts/gen-dark.py order.html theme-dark-order.css apple && python3 scripts/gen-dark.py pos.html theme-dark-pos.css apple || true; fi
cp index.html order.html hub.html signup.html track.html invoice-doc.js motion.js theme.js theme-dark-base.css theme-dark.css theme-dark-hub.css wokdb.js modpick.js sw.js strips.js sheets.js ioskit.js ioskit.css theme-dark-order.css v2.css v2.js v3.js hubv3.js orderv3.js sheetkit.js ioskit-touch.js portal.webmanifest admin.webmanifest web/
cp skwyd-icon-32.png skwyd-icon-180.png skwyd-icon-512.png portal-icon-32.png portal-icon-180.png portal-icon-512.png admin-icon-32.png admin-icon-180.png admin-icon-512.png web/
# test copy of the POS for dev.pos.skwydhub.com (the middleware only serves it on that address)
for f in pos.html pos.webmanifest pos-icon-192.png pos-icon-512.png theme-dark-pos.css posv3.js; do if [ -f "$f" ]; then cp "$f" web/; fi; done
cp cloudflare/_redirects cloudflare/_headers web/
echo "Built web/: $(ls web | tr '\n' ' ')"
# the back office (React, TailAdmin template) is the site's home page: its index.html replaces the previous portal's; the old /v2/ address redirects here
(cd ta && npm ci --no-audit --no-fund && SKWYD_BASE=/ npx vite build) && cp -r ta/dist/. web/ && echo "Built the back office (React) at /"
# the new POS (React Native, apps/pos) as a web app at /pos-app/ (dev.pos.skwydhub.com opens it); if it can't build, the rest of the site still publishes
(cd apps/pos && npm ci --no-audit --no-fund && EXPO_NO_TELEMETRY=1 SKWYD_WEB_BASE=/pos-app npx expo export -p web --output-dir ../../web/pos-app && echo "Built the POS web app at /pos-app/") || echo "The POS web app didn't build; skipped"
