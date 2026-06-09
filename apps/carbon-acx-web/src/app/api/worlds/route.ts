import { NextResponse } from 'next/server'
import { listWorlds } from '@/lib/worldLabs.server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const response = await listWorlds()

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
