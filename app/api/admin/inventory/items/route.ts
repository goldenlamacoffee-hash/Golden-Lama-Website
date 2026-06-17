import { NextResponse } from 'next/server'
import { requireUser, requireCapability } from '@/lib/api-auth'
import { can } from '@/lib/permissions'
import { logAudit } from '@/lib/auth'
import {
  listItems,
  createItem,
  getSummary,
  type InventoryKind,
} from '@/lib/inventory'
import { validateInventoryItem, parseOptionalNumber } from '@/lib/validation'
import { resolveVatPair, normalizeVatRate } from '@/lib/vat'

export async function GET(request: Request) {
  const auth = await requireUser()
  if ('response' in auth) return auth.response
  if (!can(auth.user.role, 'inventory:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const kind = (url.searchParams.get('kind') as InventoryKind | null) ?? undefined
  const search = url.searchParams.get('search') ?? undefined
  const lowStockOnly = url.searchParams.get('lowStock') === 'true'

  const [items, summary] = await Promise.all([
    listItems({ kind, search, lowStockOnly }),
    getSummary(),
  ])

  return NextResponse.json({ items, summary })
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

  const check = validateInventoryItem(body)
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 })
  }

  const vatRate = normalizeVatRate(parseOptionalNumber(body.vatRate) as number | null)
  const unitPrices = resolveVatPair({
    withoutVat: parseOptionalNumber(body.unitPriceWithoutVat) as number | null,
    withVat: parseOptionalNumber(body.unitPriceWithVat) as number | null,
    vatRate,
    source: body.priceSource === 'unitWithVat' ? 'withVat' : body.priceSource === 'unitWithoutVat' ? 'withoutVat' : undefined,
  })
  const purchasePrices = resolveVatPair({
    withoutVat: parseOptionalNumber(body.purchasePriceWithoutVat) as number | null,
    withVat: parseOptionalNumber(body.purchasePriceWithVat) as number | null,
    vatRate,
    source: body.priceSource === 'purchaseWithVat' ? 'withVat' : body.priceSource === 'purchaseWithoutVat' ? 'withoutVat' : undefined,
  })

  try {
    const item = await createItem(
      {
        itemCode: typeof body.itemCode === 'string' ? body.itemCode : null,
        name: body.name as string,
        inventoryKind: body.inventoryKind as InventoryKind,
        category: typeof body.category === 'string' ? body.category : null,
        unit: typeof body.unit === 'string' ? body.unit : null,
        unitPriceWithoutVat: unitPrices.withoutVat,
        unitPriceWithVat: unitPrices.withVat,
        purchasePriceWithoutVat: purchasePrices.withoutVat,
        purchasePriceWithVat: purchasePrices.withVat,
        vatRate,
        stockQuantity: (parseOptionalNumber(body.stockQuantity) as number | null) ?? 0,
        minimumStock: (parseOptionalNumber(body.minimumStock) as number | null) ?? null,
        status: typeof body.status === 'string' ? body.status : null,
        notes: typeof body.notes === 'string' ? body.notes : null,
        shopUrl: typeof body.shopUrl === 'string' ? body.shopUrl : null,
        powerWatts: typeof body.powerWatts === 'string' ? body.powerWatts : null,
      },
      auth.user.id,
    )

    await logAudit({
      actorUserId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'inventory_item_created',
      details: { itemId: item.id, name: item.name, kind: item.inventoryKind },
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message.includes('inventory_items_name_kind_uidx')) {
      return NextResponse.json({ error: 'Položka s týmto názvom už existuje.' }, { status: 409 })
    }
    if (err instanceof Error && err.message.includes('inventory_items_code_uidx')) {
      return NextResponse.json({ error: 'Položka s týmto kódom už existuje.' }, { status: 409 })
    }
    throw err
  }
}
