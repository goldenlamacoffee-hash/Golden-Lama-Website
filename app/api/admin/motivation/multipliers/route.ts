import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { logAudit } from '@/lib/auth'
import { listMultipliers, upsertMultiplier } from '@/lib/motivation'
import { validateMultiplier, parseOptionalNumber } from '@/lib/validation'

export async function GET(request: Request) {
  const auth = await requireCapability('motivation:read_all')
  if ('response' in auth) return auth.response

  const url = new URL(request.url)
  const periodStart = url.searchParams.get('periodStart')
  const periodEnd = url.searchParams.get('periodEnd')
  if (!periodStart || !periodEnd) {
    return NextResponse.json({ error: 'Chýba obdobie.' }, { status: 400 })
  }
  const multipliers = await listMultipliers(periodStart, periodEnd)
  return NextResponse.json({ multipliers })
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

  const check = validateMultiplier(body)
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 })
  }

  const multiplier = await upsertMultiplier(
    {
      staffUserId: body.staffUserId as string,
      periodStart: body.periodStart as string,
      periodEnd: body.periodEnd as string,
      multiplier: (parseOptionalNumber(body.multiplier) as number | null) ?? 1,
      note: typeof body.note === 'string' ? body.note : null,
    },
    auth.user.id,
  )

  await logAudit({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'motivation_multiplier_set',
    targetUserId: multiplier.staffUserId,
    details: { multiplier: multiplier.multiplier, periodStart: multiplier.periodStart, periodEnd: multiplier.periodEnd },
  })

  return NextResponse.json({ multiplier }, { status: 201 })
}
