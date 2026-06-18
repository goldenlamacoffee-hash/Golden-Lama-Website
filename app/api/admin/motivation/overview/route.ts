import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { getOverview } from '@/lib/motivation'

export async function GET() {
  const auth = await requireCapability('motivation:read_all')
  if ('response' in auth) return auth.response

  const overview = await getOverview()
  return NextResponse.json({ overview })
}
