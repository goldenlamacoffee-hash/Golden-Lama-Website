import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { getMaintenanceRecords, insertMaintenanceRecord, logHaccpAudit } from '@/lib/haccp'

export const runtime = 'nodejs'

function defaultRange() {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return { from: `${y}-${m}-01`, to: `${y}-${m}-${String(new Date(y, now.getUTCMonth() + 1, 0).getDate()).padStart(2, '0')}` }
}
function isDate(v: string | null): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

export async function GET(request: Request) {
  const auth = await requireCapability('haccp:view')
  if ('response' in auth) return auth.response
  const url = new URL(request.url)
  const def = defaultRange()
  const from = isDate(url.searchParams.get('from')) ? url.searchParams.get('from')! : def.from
  const to = isDate(url.searchParams.get('to')) ? url.searchParams.get('to')! : def.to
  return NextResponse.json(await getMaintenanceRecords({ from, to }))
}

export async function POST(request: Request) {
  const auth = await requireCapability('haccp:write')
  if ('response' in auth) return auth.response

  const body = await request.json()
  const { recordDate, equipment, description, performedBy, result, nextServiceDate, notes } = body

  if (!recordDate || !equipment || !description) {
    return NextResponse.json({ error: 'Chýbajú povinné polia (dátum, zariadenie, popis).' }, { status: 400 })
  }

  const record = await insertMaintenanceRecord({
    recordDate, equipment, description, performedBy, result,
    nextServiceDate: nextServiceDate || null, notes,
  })

  await logHaccpAudit({
    entityType: 'maintenance',
    entityId: record.id,
    action: 'maintenance_recorded',
    userId: auth.user.id,
    userName: auth.user.name,
  })

  return NextResponse.json(record)
}
