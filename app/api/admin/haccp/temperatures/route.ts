import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { getTemperatureRecords, insertTemperatureRecord, logHaccpAudit } from '@/lib/haccp'

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

  const records = await getTemperatureRecords({ from, to })
  return NextResponse.json(records)
}

export async function POST(request: Request) {
  const auth = await requireCapability('haccp:write')
  if ('response' in auth) return auth.response

  const body = await request.json()
  const {
    recordDate, recordTime, equipmentId, equipmentName, measuredTemp,
    tempMin, tempMax, employeeId, employeeName, correctiveAction, notes,
  } = body

  if (!recordDate || equipmentName == null || measuredTemp == null) {
    return NextResponse.json({ error: 'Chýbajú povinné polia (dátum, zariadenie, teplota).' }, { status: 400 })
  }

  const parsed = parseFloat(measuredTemp)
  if (isNaN(parsed)) return NextResponse.json({ error: 'Neplatná hodnota teploty.' }, { status: 400 })

  const isOutside =
    (tempMin != null && parsed < parseFloat(tempMin)) ||
    (tempMax != null && parsed > parseFloat(tempMax))

  if (isOutside && !correctiveAction?.trim()) {
    return NextResponse.json({ error: 'Teplota mimo limitu – vyžaduje sa nápravné opatrenie.' }, { status: 422 })
  }

  const record = await insertTemperatureRecord({
    recordDate, recordTime, equipmentId, equipmentName, measuredTemp: parsed,
    tempMin: tempMin != null ? parseFloat(tempMin) : null,
    tempMax: tempMax != null ? parseFloat(tempMax) : null,
    employeeId: employeeId ?? auth.user.id,
    employeeName: employeeName ?? auth.user.name,
    correctiveAction, notes,
  })

  await logHaccpAudit({
    entityType: 'temperature',
    entityId: record.id,
    action: isOutside ? 'temp_outside_limit' : 'temp_recorded',
    userId: auth.user.id,
    userName: auth.user.name,
    newValues: { temp: parsed, result: record.result },
  })

  return NextResponse.json(record)
}
