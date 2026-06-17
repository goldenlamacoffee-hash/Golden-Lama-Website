import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { can } from '@/lib/permissions'
import { logAudit } from '@/lib/auth'
import {
  listShifts,
  createShift,
  findOverlappingShifts,
  type ShiftStatus,
  type EntryType,
} from '@/lib/shifts'
import { validateShift } from '@/lib/validation'

export async function GET(request: Request) {
  const auth = await requireUser()
  if ('response' in auth) return auth.response

  const canReadAll = can(auth.user.role, 'calendar:read_all')
  const canReadOwn = can(auth.user.role, 'calendar:read_own')
  if (!canReadAll && !canReadOwn) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const from = url.searchParams.get('from') ?? undefined
  const to = url.searchParams.get('to') ?? undefined
  const staffParam = url.searchParams.get('staff') ?? undefined
  const statusParam = (url.searchParams.get('status') as ShiftStatus | null) ?? undefined
  const typeParam = (url.searchParams.get('type') as EntryType | null) ?? undefined

  const shifts = await listShifts({
    from,
    to,
    entryType: typeParam,
    status: canReadAll ? statusParam : undefined,
    // Managers/admins/owners may filter by a specific staff member.
    staffUserId: canReadAll ? staffParam : undefined,
    // Staff (read_own only) are locked to their own shifts and never see drafts.
    onlyStaffUserId: canReadAll ? undefined : auth.user.id,
    publishedOnly: !canReadAll,
  })

  return NextResponse.json({ shifts })
}

export async function POST(request: Request) {
  const auth = await requireUser()
  if ('response' in auth) return auth.response
  if (!can(auth.user.role, 'calendar:write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatná požiadavka' }, { status: 400 })
  }

  const check = validateShift(body)
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 })
  }

  const status = (body.status as ShiftStatus | undefined) ?? 'draft'
  const entryType = (body.entryType as EntryType | undefined) ?? 'work_shift'
  const allDay = body.allDay === true
  const staffUserId = body.staffUserId as string
  const startDate = body.startDate as string
  const endDate = body.endDate as string

  // Warn (but don't block) on overlapping entries for the same person.
  const overlaps = await findOverlappingShifts({ staffUserId, startDate, endDate })

  const shift = await createShift(
    {
      staffUserId,
      entryType,
      allDay,
      startDate,
      endDate,
      startTime: allDay ? null : (body.startTime as string),
      endTime: allDay ? null : (body.endTime as string),
      location: typeof body.location === 'string' ? body.location : '',
      position: typeof body.position === 'string' ? body.position : '',
      notes: typeof body.notes === 'string' ? body.notes : '',
      status,
    },
    auth.user.id,
  )

  await logAudit({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'shift_created',
    targetUserId: shift.staffUserId,
    details: {
      shiftId: shift.id,
      entryType: shift.entryType,
      startDate: shift.startDate,
      endDate: shift.endDate,
      status: shift.status,
    },
  })

  return NextResponse.json({ shift, overlaps }, { status: 201 })
}
