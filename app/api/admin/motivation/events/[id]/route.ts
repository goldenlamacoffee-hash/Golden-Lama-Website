import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { logAudit } from '@/lib/auth'
import { getEvent, setEventStatus } from '@/lib/motivation'

/**
 * Reverses or cancels a point event. We never hard-delete point history; instead we
 * flip the status to 'reversed' or 'cancelled'. Requires the negative-write capability
 * since it removes points from a staff member's total. A note is mandatory.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCapability('motivation:write_negative')
  if ('response' in auth) return auth.response

  const { id } = await params
  const existing = await getEvent(id)
  if (!existing) {
    return NextResponse.json({ error: 'Záznam neexistuje' }, { status: 404 })
  }
  if (existing.status !== 'active') {
    return NextResponse.json({ error: 'Záznam už nie je aktívny.' }, { status: 409 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatná požiadavka' }, { status: 400 })
  }

  const status = body.status === 'cancelled' ? 'cancelled' : 'reversed'
  const note = typeof body.note === 'string' ? body.note.trim() : ''
  if (note.length === 0) {
    return NextResponse.json({ error: 'Pri zrušení záznamu je poznámka povinná.' }, { status: 400 })
  }

  const event = await setEventStatus(id, status, note)

  await logAudit({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    action: status === 'cancelled' ? 'motivation_event_cancelled' : 'motivation_event_reversed',
    targetUserId: existing.staffUserId,
    details: { eventId: id, totalPoints: existing.totalPoints, note },
  })

  return NextResponse.json({ event })
}
