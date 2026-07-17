import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { getWaterRecords, insertWaterRecord, logHaccpAudit } from '@/lib/haccp'

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

  return NextResponse.json(await getWaterRecords({ from, to }))
}

export async function POST(request: Request) {
  const auth = await requireCapability('haccp:write')
  if ('response' in auth) return auth.response

  const body = await request.json()
  const {
    recordDate, location, waterSource, amountFilledL,
    cleanTankChecked, cleanTankSanitized, wasteTankChecked,
    wasteDisposed, disposalLocation, employeeId, employeeName, notes,
  } = body

  if (!recordDate) return NextResponse.json({ error: 'Chýba dátum.' }, { status: 400 })

  const record = await insertWaterRecord({
    recordDate, location, waterSource,
    amountFilledL: amountFilledL != null ? parseFloat(amountFilledL) : null,
    cleanTankChecked: !!cleanTankChecked,
    cleanTankSanitized: !!cleanTankSanitized,
    wasteTankChecked: !!wasteTankChecked,
    wasteDisposed: !!wasteDisposed,
    disposalLocation,
    employeeId: employeeId ?? auth.user.id,
    employeeName: employeeName ?? auth.user.name,
    notes,
  })

  await logHaccpAudit({
    entityType: 'water',
    entityId: record.id,
    action: 'water_recorded',
    userId: auth.user.id,
    userName: auth.user.name,
  })

  return NextResponse.json(record)
}
