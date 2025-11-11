/**
 * GET /api/manifests/[id]
 * Get a specific manifest by ID (hash prefix)
 */

import { NextResponse } from 'next/server'
import { getManifest, verifyManifest } from '@/lib/manifests'

// Mark as dynamic - this route requires server-side execution
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: Request,
  { params }: RouteParams
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const verify = searchParams.get('verify') === 'true'

  try {
    const manifest = await getManifest(id)

    if (!manifest) {
      return NextResponse.json(
        {
          error: 'Manifest not found',
          id,
        },
        { status: 404 }
      )
    }

    let verification = null
    if (verify) {
      verification = await verifyManifest(id)
    }

    return NextResponse.json(
      {
        manifest,
        verification,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      }
    )
  } catch (error) {
    console.error(`Error fetching manifest ${id}:`, error)

    return NextResponse.json(
      {
        error: 'Failed to fetch manifest',
        id,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
