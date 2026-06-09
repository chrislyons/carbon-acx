import { NextResponse } from 'next/server'
import { generateWorldForScenario } from '@/lib/worldLabs.server'
import type { GenerateWorldRequest } from '@/lib/worldLabs'

export const dynamic = 'force-dynamic'

function isGenerateWorldRequest(value: unknown): value is GenerateWorldRequest {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'scenarioId' in value &&
    typeof value.scenarioId === 'string'
  )
}

export async function POST(request: Request) {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Request body must be valid JSON.' },
      { status: 400 }
    )
  }

  if (!isGenerateWorldRequest(payload)) {
    return NextResponse.json(
      { error: 'Request body must include a string scenarioId.' },
      { status: 400 }
    )
  }

  try {
    const operation = await generateWorldForScenario(payload.scenarioId)

    return NextResponse.json(
      {
        operation,
        backend: {
          mode: 'live',
          canGenerate: true,
          message: 'Generation request accepted by the World Labs API.',
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
        error: error instanceof Error ? error.message : 'Failed to generate world.',
      },
      { status }
    )
  }
}
