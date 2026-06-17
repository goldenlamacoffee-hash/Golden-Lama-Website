import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { can } from '@/lib/permissions'
import { logAudit } from '@/lib/auth'
import { getShift, updateShift, deleteShift, type ShiftStatus, type ShiftInput } from '@/lib/shifts'
import { validateShift } from '@/lib/validation'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if ('response' in auth) return auth.response
  if (!can(auth.user.role, 'calendar:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const existing = await getShift(id)
  if (!existing) {
    return NextResponse.json({ error: 'Zmena sa nenašla.' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatná požiadavka' }, { status: 400 })
  }

  // Merge with existing values so partial updates can still be validated as a whole.
  const merged = {
    staffUserId: (body.staffUserId as string) ?? existing.staffUserId,
    shiftDate: (body.shiftDate as string) ?? existing.shiftDate,
    startTime: (body.startTime as string) ?? existing.startTime,
    endTime: (body.endTime as string) ?? existing.endTime,
    status: (body.status as ShiftStatus) ?? existing.status,
  }
  const check = validateShift(merged)
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 })
  }

  const patch: Partial<ShiftInput> = {}
  if (body.staffUserId !== undefined) patch.staffUserId = body.staffUserId as string
  if (body.shiftDate !== undefined) patch.shiftDate = body.shiftDate as string
  if (body.startTime !== undefined) patch.startTime = body.startTime as string
  if (body.endTime !== undefined) patch.endTime = body.endTime as string
  if (typeof body.location === 'string') patch.location = body.location
  if (typeof body.position === 'string') patch.position = body.position
  if (typeof body.notes === 'string') patch.notes = body.notes
  if (body.status !== undefined) patch.status = body.status as ShiftStatus

  const shift = await updateShift(id, patch)

  await logAudit({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    action: body.status === 'cancelled' ? 'shift_cancelled' : 'shift_updated',
    targetUserId: shift?.staffUserId ?? existing.staffUserId,
    details: { shiftId: id },
  })

  return NextResponse.json({ shift })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if ('response' in auth) return auth.response
  if (!can(auth.user.role, 'calendar:delete')) {
    return NextResponse.json({ error: 'Nemáte oprávnenie zmazať zmenu.' }, { status: 403 })
  }

  const { id } = await params
  const existing = await getShift(id)
  if (!existing) {
    return NextResponse.json({ error: 'Zmena sa nenašla.' }, { status: 404 })
  }

  await deleteShift(id)
  await logAudit({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'shift_deleted',
    targetUserId: existing.staffUserId,
    details: { shiftId: id, date: existing.shiftDate },
  })

  return NextResponse.json({ ok: true })
}
