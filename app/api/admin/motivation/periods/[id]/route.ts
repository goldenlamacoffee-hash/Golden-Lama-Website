import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { logAudit } from '@/lib/auth'
import { getPeriod, updatePeriod } from '@/lib/motivation'
import { validateBonusPeriod, parseOptionalNumber } from '@/lib/validation'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCapability('motivation:manage_settings')
  if ('response' in auth) return auth.response

  const { id } = await params
  const existing = await getPeriod(id)
  if (!existing) {
    return NextResponse.json({ error: 'Obdobie neexistuje' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatná požiadavka' }, { status: 400 })
  }

  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)
  const merged = {
    periodStart: has('periodStart') ? body.periodStart : existing.periodStart,
    periodEnd: has('periodEnd') ? body.periodEnd : existing.periodEnd,
    pointValueEur: has('pointValueEur') ? body.pointValueEur : existing.pointValueEur,
    monthlyPersonalTarget: has('monthlyPersonalTarget') ? body.monthlyPersonalTarget : existing.monthlyPersonalTarget,
    monthlyTeamTarget: has('monthlyTeamTarget') ? body.monthlyTeamTarget : existing.monthlyTeamTarget,
    teamBonusAmount: has('teamBonusAmount') ? body.teamBonusAmount : existing.teamBonusAmount,
  }
  const check = validateBonusPeriod(merged)
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 })
  }

  try {
    const period = await updatePeriod(id, {
      name: has('name') ? (typeof body.name === 'string' ? body.name : null) : existing.name,
      periodStart: has('periodStart') ? (body.periodStart as string) : undefined,
      periodEnd: has('periodEnd') ? (body.periodEnd as string) : undefined,
      pointValueEur: has('pointValueEur') ? ((parseOptionalNumber(body.pointValueEur) as number | null) ?? 0) : undefined,
      monthlyPersonalTarget: has('monthlyPersonalTarget')
        ? ((parseOptionalNumber(body.monthlyPersonalTarget) as number | null) ?? null)
        : existing.monthlyPersonalTarget,
      monthlyTeamTarget: has('monthlyTeamTarget')
        ? ((parseOptionalNumber(body.monthlyTeamTarget) as number | null) ?? null)
        : existing.monthlyTeamTarget,
      teamBonusAmount: has('teamBonusAmount')
        ? ((parseOptionalNumber(body.teamBonusAmount) as number | null) ?? null)
        : existing.teamBonusAmount,
      isActive: has('isActive') ? body.isActive === true : undefined,
      notes: has('notes') ? (typeof body.notes === 'string' ? body.notes : null) : existing.notes,
    })

    await logAudit({
      actorUserId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'motivation_period_updated',
      details: { periodId: id },
    })

    return NextResponse.json({ period })
  } catch (err) {
    if (err instanceof Error && err.message.includes('motivation_bonus_periods_range_uidx')) {
      return NextResponse.json({ error: 'Obdobie s týmto rozsahom už existuje.' }, { status: 409 })
    }
    throw err
  }
}
