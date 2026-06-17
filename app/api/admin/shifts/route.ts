import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { can } from '@/lib/permissions'
import { logAudit } from '@/lib/auth'
import { listShifts, createShift, type ShiftStatus } from '@/lib/shifts'
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

  const shifts = await listShifts({
    from,
    to,
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
  const shift = await createShift(
    {
      staffUserId: body.staffUserId as string,
      shiftDate: body.shiftDate as string,
      startTime: body.startTime as string,
      endTime: body.endTime as string,
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
    details: { shiftId: shift.id, date: shift.shiftDate, status: shift.status },
  })

  return NextResponse.json({ shift }, { status: 201 })
}
