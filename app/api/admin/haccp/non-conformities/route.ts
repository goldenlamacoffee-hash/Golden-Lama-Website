import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { getNonConformities, upsertNonConformity, logHaccpAudit } from '@/lib/haccp'

export const runtime = 'nodejs'

function isDate(v: string | null): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

export async function GET(request: Request) {
  const auth = await requireCapability('haccp:view')
  if ('response' in auth) return auth.response

  const url = new URL(request.url)
  const status = url.searchParams.get('status') || undefined
  const from = isDate(url.searchParams.get('from')) ? url.searchParams.get('from')! : undefined
  const to = isDate(url.searchParams.get('to')) ? url.searchParams.get('to')! : undefined

  return NextResponse.json(await getNonConformities({ status, from, to }))
}

export async function POST(request: Request) {
  const auth = await requireCapability('haccp:write')
  if ('response' in auth) return auth.response

  const body = await request.json()
  const {
    id, discoveredAt, category, description, affectedProduct, lotBatch,
    severity, immediateAction, correctiveAction, responsibleId, responsibleName,
    status, closedAt, closureNote, source, sourceRecordId,
  } = body

  if (!category || !description) {
    return NextResponse.json({ error: 'Chýba kategória alebo popis nezhody.' }, { status: 400 })
  }

  // Closing requires a closure note
  if (status === 'closed' && !closureNote?.trim()) {
    return NextResponse.json({ error: 'Uzavretie nezhody vyžaduje záverečnú poznámku.' }, { status: 422 })
  }

  const nc = await upsertNonConformity({
    id, discoveredAt, category, description, affectedProduct, lotBatch,
    severity: severity || 'medium',
    immediateAction, correctiveAction,
    responsibleId: responsibleId ?? auth.user.id,
    responsibleName: responsibleName ?? auth.user.name,
    status, closedAt: status === 'closed' ? (closedAt || new Date().toISOString()) : closedAt,
    closureNote, source, sourceRecordId,
  })

  await logHaccpAudit({
    entityType: 'non_conformity',
    entityId: nc?.id ?? id,
    action: id ? (status === 'closed' ? 'nc_closed' : 'nc_updated') : 'nc_created',
    userId: auth.user.id,
    userName: auth.user.name,
  })

  return NextResponse.json(nc)
}
