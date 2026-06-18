import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { logAudit } from '@/lib/auth'
import { listPeriods, createPeriod } from '@/lib/motivation'
import { validateBonusPeriod, parseOptionalNumber } from '@/lib/validation'

export async function GET() {
  const auth = await requireCapability('motivation:read_all')
  if ('response' in auth) return auth.response

  const periods = await listPeriods()
  return NextResponse.json({ periods })
}

export async function POST(request: Request) {
  const auth = await requireCapability('motivation:manage_settings')
  if ('response' in auth) return auth.response

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatná požiadavka' }, { status: 400 })
  }

  const check = validateBonusPeriod(body)
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 })
  }

  try {
    const period = await createPeriod(
      {
        name: typeof body.name === 'string' ? body.name : null,
        periodStart: body.periodStart as string,
        periodEnd: body.periodEnd as string,
        pointValueEur: (parseOptionalNumber(body.pointValueEur) as number | null) ?? 0,
        monthlyPersonalTarget: (parseOptionalNumber(body.monthlyPersonalTarget) as number | null) ?? null,
        monthlyTeamTarget: (parseOptionalNumber(body.monthlyTeamTarget) as number | null) ?? null,
        teamBonusAmount: (parseOptionalNumber(body.teamBonusAmount) as number | null) ?? null,
        isActive: body.isActive === undefined ? true : body.isActive === true,
        notes: typeof body.notes === 'string' ? body.notes : null,
      },
      auth.user.id,
    )

    await logAudit({
      actorUserId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'motivation_period_created',
      details: { periodId: period.id, periodStart: period.periodStart, periodEnd: period.periodEnd },
    })

    return NextResponse.json({ period }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message.includes('motivation_bonus_periods_range_uidx')) {
      return NextResponse.json({ error: 'Obdobie s týmto rozsahom už existuje.' }, { status: 409 })
    }
    throw err
  }
}
