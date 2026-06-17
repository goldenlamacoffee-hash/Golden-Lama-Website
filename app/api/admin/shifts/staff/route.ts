import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { listAssignableStaff } from '@/lib/shifts'

export async function GET() {
  const auth = await requireCapability('calendar:write')
  if ('response' in auth) return auth.response

  const staff = await listAssignableStaff()
  return NextResponse.json({ staff })
}
