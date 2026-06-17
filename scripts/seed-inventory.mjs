/**
 * Idempotent inventory seed.
 *
 * Seeds representative items based on the source spreadsheet sheets
 * `Pořizovací náklady` (assets) and `Provozní náklady` (operating supplies).
 *
 * - Safe to run multiple times: uniqueness is guarded by (lower(name), inventory_kind)
 *   via ON CONFLICT DO NOTHING, so re-runs never duplicate rows.
 * - Item codes are auto-generated (OP-0001 / AS-0001) when missing.
 *
 * Run with env loaded:
 *   node --env-file-if-exists=/vercel/share/.env.project scripts/seed-inventory.mjs
 */
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// inventory_kind: 'operating' | 'asset'
const OPERATING = [
  // name, category, unit, unitPrice(s DPH/jedn.), stock, minStock, status, costPerCoffee, shopUrl
  { name: "Káva - espresso zmes 1kg", category: "Káva", unit: "kg", unitPrice: 24.9, stock: 12, minStock: 5, status: "Skladem", costPerCoffee: 0.18, shopUrl: null },
  { name: "Matcha prémiová 100g", category: "Matcha", unit: "ks", unitPrice: 18.5, stock: 6, minStock: 2, status: "Skladem", costPerCoffee: 0.45, shopUrl: null },
  { name: "Mlieko polotučné 1L", category: "Mlieko", unit: "l", unitPrice: 1.15, stock: 40, minStock: 20, status: "Skladem", costPerCoffee: 0.12, shopUrl: null },
  { name: "Rastlinné mlieko ovsené 1L", category: "Mlieko", unit: "l", unitPrice: 2.3, stock: 18, minStock: 8, status: "Skladem", costPerCoffee: 0.22, shopUrl: null },
  { name: "Cukor biely 1kg", category: "Sladidlá", unit: "kg", unitPrice: 0.99, stock: 15, minStock: 5, status: "Skladem", costPerCoffee: 0.01, shopUrl: null },
  { name: "Pohár papierový 12oz", category: "Obaly", unit: "ks", unitPrice: 0.09, stock: 800, minStock: 300, status: "Skladem", costPerCoffee: 0.09, shopUrl: null },
  { name: "Pohár papierový 8oz", category: "Obaly", unit: "ks", unitPrice: 0.07, stock: 600, minStock: 300, status: "Dochádza", costPerCoffee: 0.07, shopUrl: null },
  { name: "Viečko na pohár", category: "Obaly", unit: "ks", unitPrice: 0.04, stock: 1200, minStock: 400, status: "Skladem", costPerCoffee: 0.04, shopUrl: null },
  { name: "Servítky", category: "Hygiena", unit: "balenie", unitPrice: 1.5, stock: 25, minStock: 10, status: "Skladem", costPerCoffee: 0.01, shopUrl: null },
  { name: "Utierky kuchynské", category: "Hygiena", unit: "balenie", unitPrice: 2.2, stock: 10, minStock: 4, status: "Skladem", costPerCoffee: null, shopUrl: null },
  { name: "Filtre na vodu", category: "Údržba", unit: "ks", unitPrice: 14.0, stock: 3, minStock: 2, status: "Objednať", costPerCoffee: null, shopUrl: null },
  { name: "Plyn do bojlera", category: "Energie", unit: "ks", unitPrice: 19.9, stock: 2, minStock: 1, status: "Skladem", costPerCoffee: null, shopUrl: null },
]

const ASSETS = [
  // name, category, purchasePrice(s DPH), quantity, status, powerWatts, shopUrl
  { name: "Kávovar La Marzocco Linea Mini", category: "Stroj", purchasePrice: 5200, quantity: 1, status: "Skladem", powerWatts: "3000", shopUrl: null },
  { name: "Mlynček Mahlkönig E65S", category: "Mlynček", purchasePrice: 1450, quantity: 1, status: "Skladem", powerWatts: "650", shopUrl: null },
  { name: "PuQPress automatický temper", category: "Príprava", purchasePrice: 980, quantity: 1, status: "Skladem", powerWatts: "60", shopUrl: null },
  { name: "Sync váha Acaia", category: "Príprava", purchasePrice: 230, quantity: 2, status: "Skladem", powerWatts: null, shopUrl: null },
  { name: "Bicykel nákladný (cargo)", category: "Mobilita", purchasePrice: 3200, quantity: 1, status: "Skladem", powerWatts: null, shopUrl: null },
  { name: "Vozík / trailer", category: "Mobilita", purchasePrice: 1800, quantity: 1, status: "Skladem", powerWatts: null, shopUrl: null },
  { name: "Batéria 12V", category: "Energie", purchasePrice: 420, quantity: 1, status: "Skladem", powerWatts: "12V batéria - 15w približne", shopUrl: null },
  { name: "Menič napätia (invertor)", category: "Energie", purchasePrice: 260, quantity: 1, status: "Skladem", powerWatts: "1500", shopUrl: null },
  { name: "Nabíjačka batérie", category: "Energie", purchasePrice: 140, quantity: 1, status: "Skladem", powerWatts: "200", shopUrl: null },
  { name: "Predplatné účtovný softvér (ročne)", category: "Softvér", purchasePrice: 240, quantity: 1, status: "Kúpené", powerWatts: null, shopUrl: null },
]

async function nextCode(client, kind) {
  const prefix = kind === "asset" ? "AS" : "OP"
  const res = await client.query(
    `SELECT MAX(CAST(substring(item_code FROM '${prefix}-([0-9]+)$') AS integer)) AS max_num
     FROM inventory_items WHERE item_code ~ '^${prefix}-[0-9]+$'`,
  )
  return (res.rows[0]?.max_num ?? 0) + 1
}

async function main() {
  const client = await pool.connect()
  let inserted = 0
  let skipped = 0
  try {
    await client.query("BEGIN")

    let opSeq = await nextCode(client, "operating")
    for (const it of OPERATING) {
      const code = `OP-${String(opSeq).padStart(4, "0")}`
      const r = await client.query(
        `INSERT INTO inventory_items
           (item_code, name, inventory_kind, category, unit, unit_price_with_vat,
            stock_quantity, minimum_stock, status, cost_per_coffee, shop_url)
         VALUES ($1,$2,'operating',$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (lower(name), inventory_kind) DO NOTHING
         RETURNING id`,
        [code, it.name, it.category, it.unit, it.unitPrice, it.stock, it.minStock, it.status, it.costPerCoffee, it.shopUrl],
      )
      if (r.rowCount > 0) {
        inserted += 1
        opSeq += 1
      } else {
        skipped += 1
      }
    }

    let asSeq = await nextCode(client, "asset")
    for (const it of ASSETS) {
      const code = `AS-${String(asSeq).padStart(4, "0")}`
      const r = await client.query(
        `INSERT INTO inventory_items
           (item_code, name, inventory_kind, category, purchase_price_with_vat,
            stock_quantity, status, power_watts, shop_url)
         VALUES ($1,$2,'asset',$3,$4,$5,$6,$7,$8)
         ON CONFLICT (lower(name), inventory_kind) DO NOTHING
         RETURNING id`,
        [code, it.name, it.category, it.purchasePrice, it.quantity, it.status, it.powerWatts, it.shopUrl],
      )
      if (r.rowCount > 0) {
        inserted += 1
        asSeq += 1
      } else {
        skipped += 1
      }
    }

    await client.query("COMMIT")
    console.log(`[seed-inventory] inserted=${inserted} skipped(existing)=${skipped}`)
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("[seed-inventory] failed:", err)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

main()
