import { NextResponse } from 'next/server'
import { requireUser, requireCapability } from '@/lib/api-auth'
import { can } from '@/lib/permissions'
import { logAudit } from '@/lib/auth'
import {
  getItem,
  updateItem,
  deactivateItem,
  deleteItem,
  type InventoryKind,
} from '@/lib/inventory'
import { validateInventoryItem, parseOptionalNumber } from '@/lib/validation'
import { resolveVatPair, normalizeVatRate } from '@/lib/vat'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if ('response' in auth) return auth.response
  if (!can(auth.user.role, 'inventory:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const item = await getItem(id)
  if (!item) {
    return NextResponse.json({ error: 'Položka neexistuje' }, { status: 404 })
  }
  return NextResponse.json({ item })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCapability('inventory:write')
  if ('response' in auth) return auth.response

  const { id } = await params
  const existing = await getItem(id)
  if (!existing) {
    return NextResponse.json({ error: 'Položka neexistuje' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatná požiadavka' }, { status: 400 })
  }

  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)

  // Resolve effective values, falling back to existing ones for omitted fields.
  const vatRate = normalizeVatRate(
    has('vatRate') ? (parseOptionalNumber(body.vatRate) as number | null) : existing.vatRate,
  )
  const unitPrices = resolveVatPair({
    withoutVat: has('unitPriceWithoutVat')
      ? (parseOptionalNumber(body.unitPriceWithoutVat) as number | null)
      : existing.unitPriceWithoutVat,
    withVat: has('unitPriceWithVat')
      ? (parseOptionalNumber(body.unitPriceWithVat) as number | null)
      : existing.unitPriceWithVat,
    vatRate,
    source: body.priceSource === 'unitWithVat' ? 'withVat' : body.priceSource === 'unitWithoutVat' ? 'withoutVat' : undefined,
  })
  const purchasePrices = resolveVatPair({
    withoutVat: has('purchasePriceWithoutVat')
      ? (parseOptionalNumber(body.purchasePriceWithoutVat) as number | null)
      : existing.purchasePriceWithoutVat,
    withVat: has('purchasePriceWithVat')
      ? (parseOptionalNumber(body.purchasePriceWithVat) as number | null)
      : existing.purchasePriceWithVat,
    vatRate,
    source: body.priceSource === 'purchaseWithVat' ? 'withVat' : body.priceSource === 'purchaseWithoutVat' ? 'withoutVat' : undefined,
  })

  // Validate using merged values so partial updates are checked correctly.
  const merged = {
    name: body.name ?? existing.name,
    inventoryKind: body.inventoryKind ?? existing.inventoryKind,
    stockQuantity: body.stockQuantity ?? existing.stockQuantity,
    minimumStock: body.minimumStock ?? existing.minimumStock,
    unitPriceWithoutVat: unitPrices.withoutVat,
    unitPriceWithVat: unitPrices.withVat,
    purchasePriceWithoutVat: purchasePrices.withoutVat,
    purchasePriceWithVat: purchasePrices.withVat,
    vatRate,
  }
  const check = validateInventoryItem(merged)
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 })
  }

  try {
    const item = await updateItem(id, {
      itemCode: has('itemCode') ? (typeof body.itemCode === 'string' ? body.itemCode : null) : existing.itemCode,
      name: has('name') ? (body.name as string) : existing.name,
      inventoryKind: has('inventoryKind') ? (body.inventoryKind as InventoryKind) : existing.inventoryKind,
      category: has('category') ? (typeof body.category === 'string' ? body.category : null) : existing.category,
      unit: has('unit') ? (typeof body.unit === 'string' ? body.unit : null) : existing.unit,
      unitPriceWithoutVat: unitPrices.withoutVat,
      unitPriceWithVat: unitPrices.withVat,
      purchasePriceWithoutVat: purchasePrices.withoutVat,
      purchasePriceWithVat: purchasePrices.withVat,
      vatRate,
      // Stock quantity is managed via movements; only direct edits when explicitly sent.
      stockQuantity: has('stockQuantity')
        ? ((parseOptionalNumber(body.stockQuantity) as number | null) ?? existing.stockQuantity)
        : existing.stockQuantity,
      minimumStock: has('minimumStock')
        ? ((parseOptionalNumber(body.minimumStock) as number | null) ?? null)
        : existing.minimumStock,
      status: has('status') ? (typeof body.status === 'string' ? body.status : null) : existing.status,
      notes: has('notes') ? (typeof body.notes === 'string' ? body.notes : null) : existing.notes,
      shopUrl: has('shopUrl') ? (typeof body.shopUrl === 'string' ? body.shopUrl : null) : existing.shopUrl,
      powerWatts: has('powerWatts') ? (typeof body.powerWatts === 'string' ? body.powerWatts : null) : existing.powerWatts,
    })

    await logAudit({
      actorUserId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'inventory_item_updated',
      details: { itemId: id, name: item?.name },
    })

    return NextResponse.json({ item })
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCapability('inventory:delete')
  if ('response' in auth) return auth.response

  const { id } = await params
  const existing = await getItem(id)
  if (!existing) {
    return NextResponse.json({ error: 'Položka neexistuje' }, { status: 404 })
  }

  const url = new URL(request.url)
  const hard = url.searchParams.get('hard') === 'true'

  if (hard) {
    await deleteItem(id)
  } else {
    await deactivateItem(id)
  }

  await logAudit({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    action: hard ? 'inventory_item_deleted' : 'inventory_item_deactivated',
    details: { itemId: id, name: existing.name },
  })

  return NextResponse.json({ ok: true })
}
