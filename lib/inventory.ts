import { pool } from './db'

export type InventoryKind = 'operating' | 'asset'

export const INVENTORY_KINDS: InventoryKind[] = ['operating', 'asset']

export type MovementType = 'purchase' | 'usage' | 'adjustment' | 'waste' | 'transfer'

export const MOVEMENT_TYPES: MovementType[] = ['purchase', 'usage', 'adjustment', 'waste', 'transfer']

export const DEFAULT_VAT_RATE = 23

export interface InventoryItem {
  id: string
  itemCode: string | null
  name: string
  inventoryKind: InventoryKind
  category: string | null
  unit: string | null
  unitPriceWithoutVat: number | null
  unitPriceWithVat: number | null
  purchasePriceWithoutVat: number | null
  purchasePriceWithVat: number | null
  vatRate: number | null
  stockQuantity: number
  minimumStock: number | null
  status: string | null
  notes: string | null
  shopUrl: string | null
  powerWatts: string | null
  isActive: boolean
  createdBy: string | null
  createdAt: string
  updatedAt: string
  /** Computed valuation (with VAT). Operating uses unit price, assets use purchase price. */
  stockValueWithVat: number
  /** Computed valuation (without VAT). */
  stockValueWithoutVat: number
  /** Back-compat alias of stockValueWithVat. */
  stockValue: number
  /** Computed: stockQuantity below minimumStock (when minimumStock set). */
  lowStock: boolean
}

interface ItemRow {
  id: string
  item_code: string | null
  name: string
  inventory_kind: InventoryKind
  category: string | null
  unit: string | null
  unit_price_without_vat: string | null
  unit_price_with_vat: string | null
  purchase_price_without_vat: string | null
  purchase_price_with_vat: string | null
  vat_rate: string | null
  stock_quantity: string
  minimum_stock: string | null
  status: string | null
  notes: string | null
  shop_url: string | null
  power_watts: string | null
  is_active: boolean
  created_by: string | null
  created_at: Date
  updated_at: Date
}

function num(v: string | null): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const round2 = (n: number) => Math.round(n * 100) / 100

function mapItem(row: ItemRow): InventoryItem {
  const stockQuantity = num(row.stock_quantity) ?? 0
  const unitPriceWithoutVat = num(row.unit_price_without_vat)
  const unitPriceWithVat = num(row.unit_price_with_vat)
  const purchasePriceWithoutVat = num(row.purchase_price_without_vat)
  const purchasePriceWithVat = num(row.purchase_price_with_vat)
  const vatRate = num(row.vat_rate)
  const minimumStock = num(row.minimum_stock)

  // Operating items are valued at unit price, assets at purchase price; fall back
  // to the other price so legacy rows still produce a value.
  const valWithVat =
    (row.inventory_kind === 'asset' ? purchasePriceWithVat : unitPriceWithVat) ??
    purchasePriceWithVat ??
    unitPriceWithVat ??
    0
  const valWithoutVat =
    (row.inventory_kind === 'asset' ? purchasePriceWithoutVat : unitPriceWithoutVat) ??
    purchasePriceWithoutVat ??
    unitPriceWithoutVat ??
    0

  const stockValueWithVat = round2(stockQuantity * valWithVat)
  const stockValueWithoutVat = round2(stockQuantity * valWithoutVat)

  return {
    id: row.id,
    itemCode: row.item_code,
    name: row.name,
    inventoryKind: row.inventory_kind,
    category: row.category,
    unit: row.unit,
    unitPriceWithoutVat,
    unitPriceWithVat,
    purchasePriceWithoutVat,
    purchasePriceWithVat,
    vatRate,
    stockQuantity,
    minimumStock,
    status: row.status,
    notes: row.notes,
    shopUrl: row.shop_url,
    powerWatts: row.power_watts,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    stockValueWithVat,
    stockValueWithoutVat,
    stockValue: stockValueWithVat,
    lowStock: minimumStock !== null && stockQuantity < minimumStock,
  }
}

const SELECT_ITEM = `
  SELECT id, item_code, name, inventory_kind, category, unit,
         unit_price_without_vat, unit_price_with_vat,
         purchase_price_without_vat, purchase_price_with_vat, vat_rate,
         stock_quantity, minimum_stock, status, notes, shop_url, power_watts,
         is_active, created_by, created_at, updated_at
  FROM inventory_items
`

export interface ItemFilters {
  kind?: InventoryKind
  search?: string
  includeInactive?: boolean
  lowStockOnly?: boolean
}

export async function listItems(filters: ItemFilters = {}): Promise<InventoryItem[]> {
  const clauses: string[] = []
  const params: unknown[] = []

  if (!filters.includeInactive) {
    clauses.push(`is_active = true`)
  }
  if (filters.kind) {
    params.push(filters.kind)
    clauses.push(`inventory_kind = $${params.length}`)
  }
  if (filters.search) {
    params.push(`%${filters.search.trim().toLowerCase()}%`)
    clauses.push(
      `(lower(name) LIKE $${params.length} OR lower(coalesce(item_code,'')) LIKE $${params.length} OR lower(coalesce(category,'')) LIKE $${params.length})`,
    )
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const result = await pool.query<ItemRow>(
    `${SELECT_ITEM} ${where} ORDER BY inventory_kind ASC, name ASC`,
    params,
  )
  let items = result.rows.map(mapItem)
  if (filters.lowStockOnly) {
    items = items.filter((i) => i.lowStock)
  }
  return items
}

export async function getItem(id: string): Promise<InventoryItem | null> {
  const result = await pool.query<ItemRow>(`${SELECT_ITEM} WHERE id = $1 LIMIT 1`, [id])
  const row = result.rows[0]
  return row ? mapItem(row) : null
}

export interface ItemInput {
  itemCode: string | null
  name: string
  inventoryKind: InventoryKind
  category: string | null
  unit: string | null
  unitPriceWithoutVat: number | null
  unitPriceWithVat: number | null
  purchasePriceWithoutVat: number | null
  purchasePriceWithVat: number | null
  vatRate: number | null
  stockQuantity: number
  minimumStock: number | null
  status: string | null
  notes: string | null
  shopUrl: string | null
  powerWatts: string | null
}

/**
 * Generates the next sequential item code, prefixed by kind: OP-0001 for operating
 * items and AS-0001 for assets. Unique within its prefix series.
 */
export async function nextItemCode(kind: InventoryKind): Promise<string> {
  const prefix = kind === 'asset' ? 'AS' : 'OP'
  const result = await pool.query<{ max_num: number | null }>(
    `SELECT MAX(CAST(substring(item_code FROM '${prefix}-([0-9]+)$') AS integer)) AS max_num
     FROM inventory_items
     WHERE item_code ~ '^${prefix}-[0-9]+$'`,
  )
  const next = (result.rows[0]?.max_num ?? 0) + 1
  return `${prefix}-${String(next).padStart(4, '0')}`
}

export async function createItem(input: ItemInput, createdBy: string): Promise<InventoryItem> {
  const itemCode =
    input.itemCode && input.itemCode.trim() ? input.itemCode.trim() : await nextItemCode(input.inventoryKind)
  const result = await pool.query<{ id: string }>(
    `INSERT INTO inventory_items
       (item_code, name, inventory_kind, category, unit,
        unit_price_without_vat, unit_price_with_vat,
        purchase_price_without_vat, purchase_price_with_vat, vat_rate,
        stock_quantity, minimum_stock, status, notes, shop_url, power_watts, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING id`,
    [
      itemCode,
      input.name.trim(),
      input.inventoryKind,
      input.category?.trim() || null,
      input.unit?.trim() || null,
      input.unitPriceWithoutVat,
      input.unitPriceWithVat,
      input.purchasePriceWithoutVat,
      input.purchasePriceWithVat,
      input.vatRate,
      input.stockQuantity,
      input.minimumStock,
      input.status?.trim() || null,
      input.notes?.trim() || null,
      input.shopUrl?.trim() || null,
      input.powerWatts?.trim() || null,
      createdBy,
    ],
  )
  return (await getItem(result.rows[0].id)) as InventoryItem
}

export async function updateItem(id: string, patch: Partial<ItemInput>): Promise<InventoryItem | null> {
  const result = await pool.query<{ id: string }>(
    `UPDATE inventory_items SET
       item_code = COALESCE($2, item_code),
       name = COALESCE($3, name),
       inventory_kind = COALESCE($4, inventory_kind),
       category = $5,
       unit = $6,
       unit_price_without_vat = $7,
       unit_price_with_vat = $8,
       purchase_price_without_vat = $9,
       purchase_price_with_vat = $10,
       vat_rate = $11,
       stock_quantity = COALESCE($12, stock_quantity),
       minimum_stock = $13,
       status = $14,
       notes = $15,
       shop_url = $16,
       power_watts = $17,
       updated_at = now()
     WHERE id = $1
     RETURNING id`,
    [
      id,
      patch.itemCode?.trim() || null,
      patch.name?.trim() ?? null,
      patch.inventoryKind ?? null,
      patch.category?.trim() || null,
      patch.unit?.trim() || null,
      patch.unitPriceWithoutVat ?? null,
      patch.unitPriceWithVat ?? null,
      patch.purchasePriceWithoutVat ?? null,
      patch.purchasePriceWithVat ?? null,
      patch.vatRate ?? null,
      patch.stockQuantity ?? null,
      patch.minimumStock ?? null,
      patch.status?.trim() || null,
      patch.notes?.trim() || null,
      patch.shopUrl?.trim() || null,
      patch.powerWatts?.trim() || null,
    ],
  )
  if (result.rowCount === 0) return null
  return getItem(id)
}

/** Soft-delete: marks item inactive (keeps movement history). */
export async function deactivateItem(id: string): Promise<void> {
  await pool.query('UPDATE inventory_items SET is_active = false, updated_at = now() WHERE id = $1', [id])
}

/** Hard delete: removes item and its movements (cascade). */
export async function deleteItem(id: string): Promise<void> {
  await pool.query('DELETE FROM inventory_items WHERE id = $1', [id])
}

export interface InventoryMovement {
  id: string
  itemId: string
  itemName: string
  itemCode: string | null
  movementType: MovementType
  quantityChange: number
  unitPriceWithoutVat: number | null
  unitPriceWithVat: number | null
  vatRate: number | null
  note: string | null
  createdBy: string | null
  createdByName: string | null
  createdAt: string
}

interface MovementRow {
  id: string
  item_id: string
  item_name: string
  item_code: string | null
  movement_type: MovementType
  quantity_change: string
  unit_price_without_vat: string | null
  unit_price_with_vat: string | null
  vat_rate: string | null
  note: string | null
  created_by: string | null
  created_by_name: string | null
  created_at: Date
}

function mapMovement(row: MovementRow): InventoryMovement {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name,
    itemCode: row.item_code,
    movementType: row.movement_type,
    quantityChange: num(row.quantity_change) ?? 0,
    unitPriceWithoutVat: num(row.unit_price_without_vat),
    unitPriceWithVat: num(row.unit_price_with_vat),
    vatRate: num(row.vat_rate),
    note: row.note,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at.toISOString(),
  }
}

const SELECT_MOVEMENT = `
  SELECT m.id, m.item_id, i.name AS item_name, i.item_code AS item_code,
         m.movement_type, m.quantity_change,
         m.unit_price_without_vat, m.unit_price_with_vat, m.vat_rate, m.note,
         m.created_by, u.name AS created_by_name, m.created_at
  FROM inventory_movements m
  JOIN inventory_items i ON i.id = m.item_id
  LEFT JOIN admin_users u ON u.id = m.created_by
`

export async function listMovements(args: { itemId?: string; limit?: number } = {}): Promise<InventoryMovement[]> {
  const clauses: string[] = []
  const params: unknown[] = []
  if (args.itemId) {
    params.push(args.itemId)
    clauses.push(`m.item_id = $${params.length}`)
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const limit = Math.min(Math.max(args.limit ?? 100, 1), 500)
  const result = await pool.query<MovementRow>(
    `${SELECT_MOVEMENT} ${where} ORDER BY m.created_at DESC LIMIT ${limit}`,
    params,
  )
  return result.rows.map(mapMovement)
}

export interface MovementInput {
  itemId: string
  movementType: MovementType
  quantityChange: number
  unitPriceWithoutVat: number | null
  unitPriceWithVat: number | null
  vatRate: number | null
  note: string | null
}

/**
 * Records a stock movement and adjusts the item's stock_quantity atomically.
 * quantityChange is signed (positive adds stock, negative removes). Throws if the
 * resulting stock would go negative or the item does not exist.
 */
export async function recordMovement(
  input: MovementInput,
  createdBy: string,
): Promise<{ movement: InventoryMovement; item: InventoryItem }> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const lock = await client.query<{ stock_quantity: string }>(
      `SELECT stock_quantity FROM inventory_items WHERE id = $1 FOR UPDATE`,
      [input.itemId],
    )
    if (lock.rowCount === 0) {
      throw new Error('ITEM_NOT_FOUND')
    }
    const current = Number(lock.rows[0].stock_quantity)
    const next = current + input.quantityChange
    if (next < 0) {
      throw new Error('NEGATIVE_STOCK')
    }
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO inventory_movements
         (item_id, movement_type, quantity_change, unit_price_without_vat, unit_price_with_vat, vat_rate, note, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        input.itemId,
        input.movementType,
        input.quantityChange,
        input.unitPriceWithoutVat,
        input.unitPriceWithVat,
        input.vatRate,
        input.note?.trim() || null,
        createdBy,
      ],
    )
    await client.query(
      `UPDATE inventory_items SET stock_quantity = $2, updated_at = now() WHERE id = $1`,
      [input.itemId, next],
    )
    await client.query('COMMIT')

    const movResult = await pool.query<MovementRow>(`${SELECT_MOVEMENT} WHERE m.id = $1`, [
      inserted.rows[0].id,
    ])
    const item = await getItem(input.itemId)
    return { movement: mapMovement(movResult.rows[0]), item: item as InventoryItem }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export interface InventorySummary {
  operatingCount: number
  assetCount: number
  operatingStockValueWithVat: number
  operatingStockValueWithoutVat: number
  assetStockValueWithVat: number
  assetStockValueWithoutVat: number
  totalStockValueWithVat: number
  totalStockValueWithoutVat: number
  lowStockCount: number
}

export async function getSummary(): Promise<InventorySummary> {
  const items = await listItems({ includeInactive: false })
  let operatingCount = 0
  let assetCount = 0
  let operatingStockValueWithVat = 0
  let operatingStockValueWithoutVat = 0
  let assetStockValueWithVat = 0
  let assetStockValueWithoutVat = 0
  let lowStockCount = 0
  for (const it of items) {
    if (it.inventoryKind === 'operating') {
      operatingCount += 1
      operatingStockValueWithVat += it.stockValueWithVat
      operatingStockValueWithoutVat += it.stockValueWithoutVat
    } else {
      assetCount += 1
      assetStockValueWithVat += it.stockValueWithVat
      assetStockValueWithoutVat += it.stockValueWithoutVat
    }
    if (it.lowStock) lowStockCount += 1
  }
  return {
    operatingCount,
    assetCount,
    operatingStockValueWithVat: round2(operatingStockValueWithVat),
    operatingStockValueWithoutVat: round2(operatingStockValueWithoutVat),
    assetStockValueWithVat: round2(assetStockValueWithVat),
    assetStockValueWithoutVat: round2(assetStockValueWithoutVat),
    totalStockValueWithVat: round2(operatingStockValueWithVat + assetStockValueWithVat),
    totalStockValueWithoutVat: round2(operatingStockValueWithoutVat + assetStockValueWithoutVat),
    lowStockCount,
  }
}
