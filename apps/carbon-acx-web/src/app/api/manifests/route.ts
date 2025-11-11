/**
 * GET /api/manifests
 * List all available manifests
 */

import { NextResponse } from 'next/server'
import { getManifests } from '@/lib/manifests'

// Force static generation at build time
export const dynamic = 'force-static'
export const revalidate = false

export async function GET() {
  try {
    const manifests = await getManifests()

    return NextResponse.json(
      {
        manifests,
        count: manifests.length,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching manifests:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch manifests',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
