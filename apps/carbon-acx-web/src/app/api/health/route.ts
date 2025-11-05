/**
 * GET /api/health
 * Health check endpoint
 */

import { NextResponse } from 'next/server'
import { getRootManifest } from '@/lib/manifests'

export async function GET() {
  try {
    // Test that we can read the root manifest
    const rootManifest = await getRootManifest()
    const figureCount = rootManifest.figures.length

    return NextResponse.json(
      {
        status: 'ok',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        checks: {
          manifests: {
            accessible: true,
            figure_count: figureCount,
          },
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('Health check failed:', error)

    return NextResponse.json(
      {
        status: 'error',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        checks: {
          manifests: {
            accessible: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      },
      { status: 503 }
    )
  }
}
