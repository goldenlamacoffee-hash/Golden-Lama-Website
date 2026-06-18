import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { can } from '@/lib/permissions'
import { logAudit } from '@/lib/auth'
import {
  listEvents,
  createEvent,
  getRule,
  type PointCategory,
  type PointEventStatus,
  type PointSource,
} from '@/lib/motivation'
import { validatePointEvent, parseOptionalNumber } from '@/lib/validation'

export async function GET(request: Request) {
  const auth = await requireCapability('motivation:read_all')
  if ('response' in auth) return auth.response

  const url = new URL(request.url)
  const staffUserId = url.searchParams.get('staffUserId') ?? undefined
  const category = (url.searchParams.get('category') as PointCategory | null) ?? undefined
  const status = (url.searchParams.get('status') as PointEventStatus | null) ?? undefined
  const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined

  const events = await listEvents({ staffUserId, category, status, limit })
  return NextResponse.json({ events })
}

export async function POST(request: Request) {
  const auth = await requireCapability('motivation:write')
  if ('response' in auth) return auth.response

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatná požiadavka' }, { status: 400 })
  }

  // Staff can never create their own (or anyone's) points without write capability,
  // which they don't have. Extra guard: block self-assignment for non-managers? No —
  // owner/admin/manager may assign to anyone, including themselves.
  const allowNegative = can(auth.user.role, 'motivation:write_negative')

  // If a rule is referenced, derive category/pointsPerUnit/productName from it.
  let category = body.category as PointCategory | undefined
  let pointsPerUnit = parseOptionalNumber(body.pointsPerUnit) as number | null
  let productName = typeof body.productName === 'string' ? body.productName : null
  let ruleId: string | null = typeof body.ruleId === 'string' && body.ruleId ? body.ruleId : null

  if (ruleId) {
    const rule = await getRule(ruleId)
    if (!rule || !rule.isActive) {
      return NextResponse.json({ error: 'Pravidlo neexistuje alebo je neaktívne.' }, { status: 400 })
    }
    category = rule.category
    if (pointsPerUnit === null || pointsPerUnit === undefined) pointsPerUnit = rule.pointsPerUnit
    if (!productName) productName = rule.productName
  }

  const check = validatePointEvent(
    {
      staffUserId: body.staffUserId,
      category,
      source: body.source,
      quantity: body.quantity,
      pointsPerUnit,
      note: body.note,
      happenedAt: body.happenedAt,
    },
    allowNegative,
  )
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 })
  }

  const source = (typeof body.source === 'string' ? body.source : 'manual') as PointSource

  const event = await createEvent(
    {
      staffUserId: body.staffUserId as string,
      category: category as PointCategory,
      source,
      ruleId,
      productName,
      quantity: (parseOptionalNumber(body.quantity) as number | null) ?? 1,
      pointsPerUnit: pointsPerUnit ?? 0,
      note: typeof body.note === 'string' ? body.note : null,
      happenedAt: typeof body.happenedAt === 'string' && body.happenedAt ? body.happenedAt : null,
    },
    auth.user.id,
  )

  await logAudit({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'motivation_event_created',
    targetUserId: event.staffUserId,
    details: {
      eventId: event.id,
      category: event.category,
      totalPoints: event.totalPoints,
      ruleId: event.ruleId,
    },
  })

  return NextResponse.json({ event }, { status: 201 })
}
