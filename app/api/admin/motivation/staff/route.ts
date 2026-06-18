import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { listAssignableStaff } from '@/lib/motivation'

export async function GET() {
  const auth = await requireCapability('motivation:read_all')
  if ('response' in auth) return auth.response

  const staff = await listAssignableStaff()
  return NextResponse.json({ staff })
}
