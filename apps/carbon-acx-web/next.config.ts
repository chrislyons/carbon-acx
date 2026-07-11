import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Loopback origins allowed to request /_next/* in dev. Silences the Next.js
  // cross-origin dev warning when the app is reached via 127.0.0.1 (e.g. the
  // Playwright e2e webServer) rather than localhost. Dev-only; no prod effect.
  allowedDevOrigins: ['localhost', '127.0.0.1'],

  // ESLint configuration
  eslint: {
    // Allow production builds to complete even with ESLint errors
    ignoreDuringBuilds: false,
  },

  outputFileTracingRoot: path.join(__dirname, '../..'),

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_ENABLE_3D: process.env.NEXT_PUBLIC_ENABLE_3D || 'true',
    NEXT_PUBLIC_ENABLE_EXPORTS: process.env.NEXT_PUBLIC_ENABLE_EXPORTS || 'true',
    NEXT_PUBLIC_ENABLE_API: process.env.NEXT_PUBLIC_ENABLE_API || 'true',
  },

  // Image optimization (for Cloudflare Pages compatibility)
  images: {
    unoptimized: process.env.CF_PAGES === '1',
  },

  // Disable telemetry
  productionBrowserSourceMaps: false,

  // Cloudflare Pages: static export for compatibility
  output: 'export',
  distDir: 'dist',
}

export default nextConfig
