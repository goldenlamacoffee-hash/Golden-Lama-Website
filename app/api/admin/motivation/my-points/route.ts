import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { getMyPoints } from '@/lib/motivation'

export async function GET() {
  const auth = await requireCapability('motivation:read_own')
  if ('response' in auth) return auth.response

  const myPoints = await getMyPoints(auth.user.id)
  return NextResponse.json({ myPoints })
}
