#!/usr/bin/env bash
# Build script for Cloudflare Pages deployment
# Runs Next.js build then @cloudflare/next-on-pages adapter from the correct directory

set -e

APP_DIR="/Users/chrislyons/dev/carbon-acx/apps/carbon-acx-web"
REPO_ROOT="/Users/chrislyons/dev/carbon-acx"

cd "$APP_DIR"

echo "🔨 Building Next.js app..."
pnpm run build

echo "⚡ Running @cloudflare/next-on-pages adapter..."
# Use --skip-build since we already built, run from app directory
npx @cloudflare/next-on-pages --skip-build --outdir dist

echo "✅ Build complete. Output in dist/"
ls -la dist/