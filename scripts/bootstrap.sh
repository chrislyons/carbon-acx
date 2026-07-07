#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
REQUIRED_NODE="20.19.4"
REQUIRED_PNPM="10.5.2"
REQUIRED_PYTHON_MINOR="3.11"
REQUIRED_POETRY_MINOR="1.8"

CHECK_ONLY=0
if [[ "${1:-}" == "--check-only" ]]; then
  CHECK_ONLY=1
fi

require_command() {
  local name=$1
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "Missing required command: $name" >&2
    return 1
  fi
}

check_node() {
  require_command node
  local actual
  actual=$(node -v | sed 's/^v//')
  if [[ "$actual" != "$REQUIRED_NODE" ]]; then
    echo "Node.js $REQUIRED_NODE required, found $actual." >&2
    echo "Use your version manager with .nvmrc before bootstrapping." >&2
    return 1
  fi
}

check_pnpm() {
  require_command pnpm
  local actual
  actual=$(pnpm -v)
  if [[ "$actual" != "$REQUIRED_PNPM" ]]; then
    echo "pnpm $REQUIRED_PNPM required, found $actual." >&2
    echo "Install or activate pnpm $REQUIRED_PNPM before bootstrapping." >&2
    return 1
  fi
}

check_python() {
  require_command python3
  local actual
  actual=$(python3 - <<'PY'
import sys
print(f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")
PY
)
  if [[ "$actual" != ${REQUIRED_PYTHON_MINOR}.* ]]; then
    echo "Python ${REQUIRED_PYTHON_MINOR}.x required, found $actual." >&2
    echo "Install Python ${REQUIRED_PYTHON_MINOR} and ensure python3 resolves to it." >&2
    return 1
  fi
}

check_poetry() {
  require_command poetry
  local actual
  actual=$(poetry --version | awk '{print $3}')
  if [[ "$actual" != ${REQUIRED_POETRY_MINOR}.* ]]; then
    echo "Poetry ${REQUIRED_POETRY_MINOR}.x required, found $actual." >&2
    echo "Install Poetry ${REQUIRED_POETRY_MINOR}.x before bootstrapping." >&2
    return 1
  fi
}

cd "$ROOT_DIR"
check_node
check_pnpm
check_python
check_poetry

if [[ "$CHECK_ONLY" -eq 1 ]]; then
  echo "Toolchain checks passed."
  exit 0
fi

echo "Installing Python dependencies..."
poetry install --with dev --no-root

echo "Installing workspace dependencies..."
pnpm install --frozen-lockfile -w
pnpm --filter carbon-acx-web install --frozen-lockfile

echo "Bootstrap complete."
