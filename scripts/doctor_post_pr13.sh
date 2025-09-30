#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$(mktemp -t doctor-post-pr13.XXXXXX.log)"
DEV_PID=""

cleanup() {
  if [[ -n "${DEV_PID}" ]]; then
    kill "${DEV_PID}" >/dev/null 2>&1 || true
    wait "${DEV_PID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

cd "${ROOT_DIR}"

echo "=== env"
echo "PUBLIC_BASE_PATH=${PUBLIC_BASE_PATH:-/}"
echo "ACX_DATA_BACKEND=${ACX_DATA_BACKEND:-unset}"

echo "=== wrangler diagnostic"
if ! npx wrangler whoami >/dev/null 2>&1; then
  echo "wrangler whoami unavailable (continuing)"
fi
if ! npx wrangler versions >/dev/null 2>&1; then
  echo "wrangler versions unavailable (continuing)"
fi

echo "=== seed dev DB"
npm run dev:seed || true

echo "=== start dev (background)"
set +e
npx concurrently -k --names "worker,site" --prefix-colors "cyan,magenta" \
  "npx wrangler dev --local --persist --port 8787" \
  "npm --prefix site run dev -- --host 127.0.0.1 --port 4173" \
  >"${LOG_FILE}" 2>&1 &
DEV_PID=$!
set -e

sleep 5

echo "=== probe health"
if ! curl -sS http://127.0.0.1:8787/api/health | jq .; then
  echo "Health probe failed" >&2
  exit 1
fi

echo "=== compute smoke"
if ! curl -sS -X POST http://127.0.0.1:8787/api/compute \
  -H 'content-type: application/json' \
  -d '{"profile_id":"PRO.TO.24_39.HYBRID.2025","overrides":{"MEDIA.STREAM.HD.HOUR":2}}' | jq .; then
  echo "Compute probe failed" >&2
  exit 1
fi

echo "=== playwright e2e"
npx playwright test tests/e2e/compute.spec.ts

echo "=== DONE"
echo "Background logs: ${LOG_FILE}"
