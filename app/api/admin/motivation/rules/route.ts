import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { logAudit } from '@/lib/auth'
import { listRules, createRule, type PointCategory } from '@/lib/motivation'
import { validatePointRule, parseOptionalNumber } from '@/lib/validation'

export async function GET(request: Request) {
  const auth = await requireCapability('motivation:read_all')
  if ('response' in auth) return auth.response

  const url = new URL(request.url)
  const includeInactive = url.searchParams.get('includeInactive') === 'true'
  const rules = await listRules({ includeInactive })
  return NextResponse.json({ rules })
}

export async function POST(request: Request) {
  const auth = await requireCapability('motivation:manage_rules')
  if ('response' in auth) return auth.response

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatná požiadavka' }, { status: 400 })
  }

  const check = validatePointRule(body)
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 })
  }

  try {
    const rule = await createRule(
      {
        name: body.name as string,
        category: body.category as PointCategory,
        productName: typeof body.productName === 'string' ? body.productName : null,
        pointsPerUnit: (parseOptionalNumber(body.pointsPerUnit) as number | null) ?? 0,
        bonusPoints: (parseOptionalNumber(body.bonusPoints) as number | null) ?? null,
        isActive: body.isActive === undefined ? true : body.isActive === true,
        notes: typeof body.notes === 'string' ? body.notes : null,
        validFrom: typeof body.validFrom === 'string' && body.validFrom ? body.validFrom : null,
        validTo: typeof body.validTo === 'string' && body.validTo ? body.validTo : null,
      },
      auth.user.id,
    )

    await logAudit({
      actorUserId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'motivation_rule_created',
      details: { ruleId: rule.id, name: rule.name, category: rule.category },
    })

    return NextResponse.json({ rule }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message.includes('motivation_point_rules_name_uidx')) {
      return NextResponse.json({ error: 'Pravidlo s týmto názvom už existuje.' }, { status: 409 })
    }
    throw err
  }
}
