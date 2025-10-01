#!/usr/bin/env bash
set -euo pipefail

BASE="${PUBLIC_BASE_PATH:-/carbon-acx/}"
if [[ "${BASE}" != */ ]]; then
  BASE="${BASE}/"
fi

echo "## local"
curl -i "http://127.0.0.1:4173${BASE}artifacts/layers.json" | sed -n '1,20p'

echo "## prod"
if [[ -z "${PAGES_DOMAIN:-}" ]]; then
  echo "Set PAGES_DOMAIN to your Cloudflare Pages domain (e.g. example.pages.dev) to query production." >&2
else
  curl -i "https://${PAGES_DOMAIN}${BASE}artifacts/layers.json" | sed -n '1,20p'
fi
