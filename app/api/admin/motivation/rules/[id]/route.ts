import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { logAudit } from '@/lib/auth'
import { getRule, updateRule, deactivateRule, type PointCategory } from '@/lib/motivation'
import { validatePointRule, parseOptionalNumber } from '@/lib/validation'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCapability('motivation:manage_rules')
  if ('response' in auth) return auth.response

  const { id } = await params
  const existing = await getRule(id)
  if (!existing) {
    return NextResponse.json({ error: 'Pravidlo neexistuje' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatná požiadavka' }, { status: 400 })
  }

  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)
  const merged = {
    name: has('name') ? body.name : existing.name,
    category: has('category') ? body.category : existing.category,
    pointsPerUnit: has('pointsPerUnit') ? body.pointsPerUnit : existing.pointsPerUnit,
    bonusPoints: has('bonusPoints') ? body.bonusPoints : existing.bonusPoints,
  }
  const check = validatePointRule(merged)
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 })
  }

  try {
    const rule = await updateRule(id, {
      name: has('name') ? (body.name as string) : undefined,
      category: has('category') ? (body.category as PointCategory) : undefined,
      productName: has('productName') ? (typeof body.productName === 'string' ? body.productName : null) : existing.productName,
      pointsPerUnit: has('pointsPerUnit') ? ((parseOptionalNumber(body.pointsPerUnit) as number | null) ?? 0) : undefined,
      bonusPoints: has('bonusPoints') ? ((parseOptionalNumber(body.bonusPoints) as number | null) ?? null) : existing.bonusPoints,
      isActive: has('isActive') ? body.isActive === true : undefined,
      notes: has('notes') ? (typeof body.notes === 'string' ? body.notes : null) : existing.notes,
      validFrom: has('validFrom') ? (typeof body.validFrom === 'string' && body.validFrom ? body.validFrom : null) : existing.validFrom,
      validTo: has('validTo') ? (typeof body.validTo === 'string' && body.validTo ? body.validTo : null) : existing.validTo,
    })

    await logAudit({
      actorUserId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'motivation_rule_updated',
      details: { ruleId: id, name: rule?.name },
    })

    return NextResponse.json({ rule })
  } catch (err) {
    if (err instanceof Error && err.message.includes('motivation_point_rules_name_uidx')) {
      return NextResponse.json({ error: 'Pravidlo s týmto názvom už existuje.' }, { status: 409 })
    }
    throw err
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCapability('motivation:manage_rules')
  if ('response' in auth) return auth.response

  const { id } = await params
  const existing = await getRule(id)
  if (!existing) {
    return NextResponse.json({ error: 'Pravidlo neexistuje' }, { status: 404 })
  }

  await deactivateRule(id)
  await logAudit({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'motivation_rule_deactivated',
    details: { ruleId: id, name: existing.name },
  })

  return NextResponse.json({ ok: true })
}
