#!/usr/bin/env bash
# Builds the website Cloudflare Pages publishes (portal.skwydhub.com and order.skwydhub.com).
# The POS ships as an Android app (built by the GitHub workflow); a test copy is served only on dev.pos.skwydhub.com.
set -euo pipefail
rm -rf web && mkdir -p web
# dark theme: rebuilt from the pages' own styles so new screens get it too (the committed copies are used if python3 is missing)
if command -v python3 >/dev/null 2>&1; then python3 scripts/gen-dark.py index.html theme-dark.css && python3 scripts/gen-dark.py hub.html theme-dark-hub.css || true; fi
cp index.html order.html hub.html signup.html track.html invoice-doc.js motion.js theme.js theme-dark-base.css theme-dark.css theme-dark-hub.css wokdb.js modpick.js sw.js strips.js sheets.js web/
cp skwyd-icon-32.png skwyd-icon-180.png skwyd-icon-512.png web/
# test copy of the POS for dev.pos.skwydhub.com (the middleware only serves it on that address)
for f in pos.html pos.webmanifest pos-icon-192.png pos-icon-512.png; do if [ -f "$f" ]; then cp "$f" web/; fi; done
cp cloudflare/_redirects cloudflare/_headers web/
echo "Built web/: $(ls web | tr '\n' ' ')"
