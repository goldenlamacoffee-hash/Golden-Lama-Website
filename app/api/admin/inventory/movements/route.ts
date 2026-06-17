import { NextResponse } from 'next/server'
import { requireUser, requireCapability } from '@/lib/api-auth'
import { can } from '@/lib/permissions'
import { logAudit } from '@/lib/auth'
import { listMovements, recordMovement, type MovementType } from '@/lib/inventory'
import { validateMovement, parseOptionalNumber } from '@/lib/validation'
import { resolveVatPair, normalizeVatRate } from '@/lib/vat'

export async function GET(request: Request) {
  const auth = await requireUser()
  if ('response' in auth) return auth.response
  if (!can(auth.user.role, 'inventory:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const itemId = url.searchParams.get('itemId') ?? undefined
  const limitParam = Number(url.searchParams.get('limit'))
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined

  const movements = await listMovements({ itemId, limit })
  return NextResponse.json({ movements })
}

export async function POST(request: Request) {
  const auth = await requireCapability('inventory:write')
  if ('response' in auth) return auth.response

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatná požiadavka' }, { status: 400 })
  }

  if (typeof body.itemId !== 'string' || body.itemId.length === 0) {
    return NextResponse.json({ error: 'Vyberte položku.' }, { status: 400 })
  }
  const check = validateMovement(body)
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 })
  }

  const vatRate = normalizeVatRate(parseOptionalNumber(body.vatRate) as number | null)
  const prices = resolveVatPair({
    withoutVat: parseOptionalNumber(body.unitPriceWithoutVat) as number | null,
    withVat: parseOptionalNumber(body.unitPriceWithVat) as number | null,
    vatRate,
    source: body.priceSource === 'withVat' ? 'withVat' : body.priceSource === 'withoutVat' ? 'withoutVat' : undefined,
  })

  try {
    const { movement, item } = await recordMovement(
      {
        itemId: body.itemId,
        movementType: body.movementType as MovementType,
        quantityChange: parseOptionalNumber(body.quantityChange) as number,
        unitPriceWithoutVat: prices.withoutVat,
        unitPriceWithVat: prices.withVat,
        vatRate: prices.withoutVat === null && prices.withVat === null ? null : vatRate,
        note: typeof body.note === 'string' ? body.note : null,
      },
      auth.user.id,
    )

    await logAudit({
      actorUserId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'inventory_movement_recorded',
      details: {
        movementId: movement.id,
        itemId: item.id,
        type: movement.movementType,
        quantityChange: movement.quantityChange,
        newStock: item.stockQuantity,
      },
    })

    return NextResponse.json({ movement, item }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'ITEM_NOT_FOUND') {
      return NextResponse.json({ error: 'Položka neexistuje' }, { status: 404 })
    }
    if (err instanceof Error && err.message === 'NEGATIVE_STOCK') {
      return NextResponse.json({ error: 'Pohyb by spôsobil záporný stav skladu.' }, { status: 400 })
    }
    throw err
  }
}
