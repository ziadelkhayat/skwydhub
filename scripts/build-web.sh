#!/usr/bin/env bash
# Builds the website Cloudflare Pages publishes (portal.skwydhub.com and order.skwydhub.com).
# The POS is not on the web: it ships as an Android app (built by the GitHub workflow).
set -euo pipefail
rm -rf web && mkdir -p web
cp index.html order.html wokdb.js modpick.js sw.js web/
cp cloudflare/_redirects cloudflare/_headers web/
echo "Built web/: $(ls web | tr '\n' ' ')"
