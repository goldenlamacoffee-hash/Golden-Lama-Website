import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { getReceivingRecords, insertReceivingRecord, logHaccpAudit } from '@/lib/haccp'

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
  return NextResponse.json(await getReceivingRecords({ from, to }))
}

export async function POST(request: Request) {
  const auth = await requireCapability('haccp:write')
  if ('response' in auth) return auth.response

  const body = await request.json()
  const { receivedAt, supplierId, supplierName, product, quantity, lotBatch, expiryDate, temperature, packageCondition, accepted, rejectionReason, receivedById, receivedByName, invoiceRef, notes } = body

  if (!product) return NextResponse.json({ error: 'Chýba názov produktu.' }, { status: 400 })
  if (!accepted && !rejectionReason?.trim()) {
    return NextResponse.json({ error: 'Zamietnutý príjem vyžaduje dôvod.' }, { status: 422 })
  }

  const record = await insertReceivingRecord({
    receivedAt, supplierId, supplierName, product, quantity, lotBatch,
    expiryDate: expiryDate || null,
    temperature: temperature != null ? parseFloat(temperature) : null,
    packageCondition: packageCondition || 'ok',
    accepted: !!accepted,
    rejectionReason,
    receivedById: receivedById ?? auth.user.id,
    receivedByName: receivedByName ?? auth.user.name,
    invoiceRef, notes,
  })

  await logHaccpAudit({
    entityType: 'receiving',
    entityId: record.id,
    action: accepted ? 'receiving_accepted' : 'receiving_rejected',
    userId: auth.user.id,
    userName: auth.user.name,
  })

  return NextResponse.json(record)
}
