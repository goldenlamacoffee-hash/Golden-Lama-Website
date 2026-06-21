import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { can } from '@/lib/permissions'
import { listAssignableStaff } from '@/lib/shifts'
import { listItems } from '@/lib/inventory'

export const runtime = 'nodejs'

/** Provides dropdown options (staff + inventory items) for the reports filters. */
export async function GET() {
  const auth = await requireCapability('reports:view')
  if ('response' in auth) return auth.response

  const staff = (await listAssignableStaff()).map((s) => ({ id: s.id, name: s.name, email: s.email }))

  // Items are only needed (and only exposed) for users allowed to export inventory.
  let items: { id: string; name: string; itemCode: string | null }[] = []
  if (can(auth.user.role, 'reports:inventory')) {
    items = (await listItems({ includeInactive: true })).map((i) => ({
      id: i.id,
      name: i.name,
      itemCode: i.itemCode,
    }))
  }

  return NextResponse.json({ staff, items })
}
