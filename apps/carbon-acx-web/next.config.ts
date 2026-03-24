import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

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
}

export default nextConfig
