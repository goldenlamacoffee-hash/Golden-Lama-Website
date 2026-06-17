import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { can } from '@/lib/permissions'
import { logAudit } from '@/lib/auth'
import {
  getShift,
  updateShift,
  deleteShift,
  findOverlappingShifts,
  type ShiftStatus,
  type EntryType,
  type ShiftInput,
} from '@/lib/shifts'
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
    return NextResponse.json({ error: 'Záznam sa nenašiel.' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatná požiadavka' }, { status: 400 })
  }

  const allDay = body.allDay !== undefined ? body.allDay === true : existing.allDay

  // Merge with existing values so partial updates can still be validated as a whole.
  const merged = {
    staffUserId: (body.staffUserId as string) ?? existing.staffUserId,
    entryType: (body.entryType as EntryType) ?? existing.entryType,
    allDay,
    startDate: (body.startDate as string) ?? existing.startDate,
    endDate: (body.endDate as string) ?? existing.endDate,
    startTime: body.startTime !== undefined ? (body.startTime as string) : existing.startTime,
    endTime: body.endTime !== undefined ? (body.endTime as string) : existing.endTime,
    status: (body.status as ShiftStatus) ?? existing.status,
  }
  const check = validateShift(merged)
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 })
  }

  const patch: Partial<ShiftInput> = {}
  if (body.staffUserId !== undefined) patch.staffUserId = body.staffUserId as string
  if (body.entryType !== undefined) patch.entryType = body.entryType as EntryType
  if (body.allDay !== undefined) patch.allDay = allDay
  if (body.startDate !== undefined) patch.startDate = body.startDate as string
  if (body.endDate !== undefined) patch.endDate = body.endDate as string
  if (body.startTime !== undefined) patch.startTime = body.startTime as string
  if (body.endTime !== undefined) patch.endTime = body.endTime as string
  if (typeof body.location === 'string') patch.location = body.location
  if (typeof body.position === 'string') patch.position = body.position
  if (typeof body.notes === 'string') patch.notes = body.notes
  if (body.status !== undefined) patch.status = body.status as ShiftStatus

  const shift = await updateShift(id, patch)

  // Recompute overlap warnings against the resulting range (excluding self).
  const overlaps = shift
    ? await findOverlappingShifts({
        staffUserId: shift.staffUserId,
        startDate: shift.startDate,
        endDate: shift.endDate,
        excludeId: id,
      })
    : []

  await logAudit({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    action: body.status === 'cancelled' ? 'shift_cancelled' : 'shift_updated',
    targetUserId: shift?.staffUserId ?? existing.staffUserId,
    details: { shiftId: id },
  })

  return NextResponse.json({ shift, overlaps })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if ('response' in auth) return auth.response
  if (!can(auth.user.role, 'calendar:delete')) {
    return NextResponse.json({ error: 'Nemáte oprávnenie zmazať záznam.' }, { status: 403 })
  }

  const { id } = await params
  const existing = await getShift(id)
  if (!existing) {
    return NextResponse.json({ error: 'Záznam sa nenašiel.' }, { status: 404 })
  }

  await deleteShift(id)
  await logAudit({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'shift_deleted',
    targetUserId: existing.staffUserId,
    details: { shiftId: id, startDate: existing.startDate, endDate: existing.endDate },
  })

  return NextResponse.json({ ok: true })
}
