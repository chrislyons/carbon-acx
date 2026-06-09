import { NextResponse } from 'next/server'
import { pollOperations } from '@/lib/worldLabs.server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ids = searchParams
    .get('ids')
    ?.split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  if (!ids || ids.length === 0) {
    return NextResponse.json(
      { error: 'Query parameter "ids" is required.' },
      { status: 400 }
    )
  }

  try {
    const operations = await pollOperations(ids)

    return NextResponse.json(
      {
        operations,
        backend: {
          mode: 'live',
          canGenerate: true,
          message: 'Polling World Labs operation status.',
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    const status =
      error instanceof Error && 'status' in error && typeof error.status === 'number'
        ? error.status
        : 500

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to poll world operations.',
      },
      { status }
    )
  }
}
