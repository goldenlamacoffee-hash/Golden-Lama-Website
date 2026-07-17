import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { getHaccpDashboard } from '@/lib/haccp'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = await requireCapability('haccp:view')
  if ('response' in auth) return auth.response

  const url = new URL(request.url)
  const today = url.searchParams.get('date') || new Date().toISOString().slice(0, 10)

  const data = await getHaccpDashboard(today)
  return NextResponse.json(data)
}
