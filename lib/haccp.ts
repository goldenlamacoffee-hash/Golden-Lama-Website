/**
 * HACCP data-access layer.
 * All queries are server-side only. Never import from client components directly.
 */
import { pool } from './db'

// ─── Constants ────────────────────────────────────────────────────────────────

export const EU_ALLERGENS: Record<number, string> = {
  1: 'Obilniny s lepkom',
  2: 'Kôrovce',
  3: 'Vajcia',
  4: 'Ryby',
  5: 'Arašidy',
  6: 'Sójové bôby',
  7: 'Mlieko / laktóza',
  8: 'Orechy',
  9: 'Zeler',
  10: 'Horčica',
  11: 'Sezamové semená',
  12: 'Oxid siričitý / siričitany',
  13: 'Vlčí bôb',
  14: 'Mäkkýše',
}

export const OPENING_ITEMS = [
  { key: 'water_filled', label: 'Pitná voda doplnená' },
  { key: 'water_tank_clean', label: 'Zásobník pitnej vody čistý' },
  { key: 'waste_tank_ready', label: 'Zásobník odpadovej vody pripravený' },
  { key: 'handwash_ok', label: 'Umývanie rúk funkčné' },
  { key: 'soap_available', label: 'Tekuté mydlo dostupné' },
  { key: 'hand_drying', label: 'Hygienické sušenie rúk dostupné' },
  { key: 'fridge_ok', label: 'Chladiace zariadenie funkčné' },
  { key: 'fridge_temp_ok', label: 'Teplota chladenia skontrolovaná' },
  { key: 'open_milks_ok', label: 'Otvorené mlieka skontrolované' },
  { key: 'no_expired', label: 'Suroviny po DMT/dátume spotreby nezistené' },
  { key: 'workspace_clean', label: 'Pracovná plocha čistá' },
  { key: 'coffee_machine_ok', label: 'Kávovar pripravený a čistý' },
  { key: 'steam_wand_ok', label: 'Parná tryska čistá' },
  { key: 'tools_clean', label: 'Náradie čisté' },
  { key: 'waste_bins_ready', label: 'Odpadkové nádoby pripravené' },
  { key: 'allergen_info', label: 'Informácie o alergénoch dostupné' },
]

export const CLOSING_ITEMS = [
  { key: 'surfaces_cleaned', label: 'Pracovné plochy vyčistené' },
  { key: 'coffee_machine_cleaned', label: 'Kávovar vyčistený' },
  { key: 'steam_wand_cleaned', label: 'Parná tryska vyčistená' },
  { key: 'tools_washed', label: 'Náradie umyté' },
  { key: 'cold_stored', label: 'Chladiace suroviny správne uskladnené' },
  { key: 'open_ingredients_ok', label: 'Otvorené suroviny skontrolované' },
  { key: 'discards_logged', label: 'Vyradené výrobky zaevidované' },
  { key: 'waste_removed', label: 'Odpad odstránený' },
  { key: 'waste_water_disposed', label: 'Odpadová voda hygienicky vypustená' },
  { key: 'tanks_cleaned', label: 'Zásobníky vyčistené podľa režimu' },
  { key: 'sanitation_done', label: 'Sanitácia dokončená' },
  { key: 'secured', label: 'Prevádzka bezpečne uzatvorená' },
]

export const DISCARD_REASONS = [
  'Po dátume spotreby',
  'Po DMT',
  'Poškodený obal',
  'Nevhodné skladovanie',
  'Zmena vzhľadu/vône',
  'Nepredaný otvorený výrobok',
  'Iné',
]

export const NC_CATEGORIES = [
  'Teplota',
  'Sanitácia',
  'Príjem surovín',
  'Alergény',
  'Voda',
  'Škodcovia',
  'Osobná hygiena',
  'Zariadenie',
  'Zásobovanie',
  'Iné',
]

export const TRAINING_TOPICS = [
  'Základy HACCP',
  'Osobná hygiena',
  'Alergény',
  'Čistenie a sanitácia',
  'Manipulácia s vodou',
  'Príjem a skladovanie potravín',
  'Nápravné opatrenia',
]

export const INGREDIENT_CATEGORIES = [
  'Coffee', 'Milk', 'Plant drink', 'Matcha', 'Chocolate',
  'Syrup', 'Puree', 'Fruit ingredient', 'Water', 'Cake/snack', 'Other',
]

// ─── Audit helper ─────────────────────────────────────────────────────────────

export async function logHaccpAudit(params: {
  entityType: string
  entityId?: string | null
  action: string
  userId?: string | null
  userName?: string | null
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  reason?: string | null
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO haccp_audit_log (entity_type, entity_id, action, user_id, user_name, old_values, new_values, reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        params.entityType,
        params.entityId ?? null,
        params.action,
        params.userId ?? null,
        params.userName ?? null,
        params.oldValues ? JSON.stringify(params.oldValues) : null,
        params.newValues ? JSON.stringify(params.newValues) : null,
        params.reason ?? null,
      ]
    )
  } catch { /* audit must not break the request */ }
}

// ─── Dashboard summary ────────────────────────────────────────────────────────

export async function getHaccpDashboard(date: string) {
  const [checks, temps, san, water, nc, recv, discards, upcoming] = await Promise.all([
    pool.query(
      `SELECT check_type, status, locked FROM haccp_daily_checks WHERE check_date=$1`,
      [date]
    ),
    pool.query(
      `SELECT result FROM haccp_temperature_records WHERE record_date=$1`,
      [date]
    ),
    pool.query(
      `SELECT result FROM haccp_sanitation_records WHERE record_date=$1`,
      [date]
    ),
    pool.query(
      `SELECT id FROM haccp_water_records WHERE record_date=$1 LIMIT 1`,
      [date]
    ),
    pool.query(
      `SELECT id, severity, status FROM haccp_non_conformities WHERE status IN ('open','in_progress') AND archived=false LIMIT 20`
    ),
    pool.query(
      `SELECT id, supplier_name, product, received_at FROM haccp_receiving_records ORDER BY received_at DESC LIMIT 1`
    ),
    pool.query(
      `SELECT id FROM haccp_discard_records WHERE record_date=$1`,
      [date]
    ),
    pool.query(
      `SELECT id, equipment, next_service_date FROM haccp_maintenance_records WHERE next_service_date BETWEEN $1 AND ($1::date + interval '14 days')`,
      [date]
    ),
  ])

  const opening = checks.rows.find(r => r.check_type === 'opening')
  const closing = checks.rows.find(r => r.check_type === 'closing')
  const tempOutside = temps.rows.filter(r => r.result === 'above_limit' || r.result === 'below_limit').length
  const tempTotal = temps.rows.length
  const sanNok = san.rows.filter(r => r.result === 'nok').length
  const sanTotal = san.rows.length

  return {
    date,
    opening: opening ? { status: opening.status, locked: opening.locked } : null,
    closing: closing ? { status: closing.status, locked: closing.locked } : null,
    temps: { total: tempTotal, outside: tempOutside },
    sanitation: { total: sanTotal, nok: sanNok },
    waterChecked: water.rows.length > 0,
    openNonConformities: nc.rows,
    lastReceiving: recv.rows[0] || null,
    discardCount: discards.rows.length,
    upcomingMaintenance: upcoming.rows,
  }
}

// ─── Daily checks ─────────────────────────────────────────────────────────────

export async function getDailyChecks(params: { from: string; to: string; type?: string }) {
  const conditions = ['check_date BETWEEN $1 AND $2']
  const values: (string | number)[] = [params.from, params.to]
  if (params.type) { conditions.push(`check_type=$${values.length + 1}`); values.push(params.type) }
  const r = await pool.query(
    `SELECT dc.*, u.name as main_worker_display
     FROM haccp_daily_checks dc
     LEFT JOIN admin_users u ON u.id = dc.main_worker_id
     WHERE ${conditions.join(' AND ')} ORDER BY check_date DESC, check_type`,
    values
  )
  return r.rows
}

export async function getDailyCheckWithItems(id: string) {
  const [check, items] = await Promise.all([
    pool.query(`SELECT * FROM haccp_daily_checks WHERE id=$1`, [id]),
    pool.query(`SELECT * FROM haccp_daily_check_items WHERE check_id=$1 ORDER BY sort_order`, [id]),
  ])
  return check.rows[0] ? { ...check.rows[0], items: items.rows } : null
}

export async function upsertDailyCheck(params: {
  id?: string
  checkDate: string
  checkType: 'opening' | 'closing'
  location?: string
  mainWorkerId?: string | null
  mainWorkerName?: string
  assistantWorkerName?: string
  notes?: string
  items: Array<{ key: string; label: string; result: 'ok' | 'nok' | 'na'; note?: string; order: number }>
  completedById?: string | null
  completedByName?: string
  complete?: boolean
}) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    let checkId = params.id

    if (checkId) {
      const existing = await client.query(`SELECT locked FROM haccp_daily_checks WHERE id=$1`, [checkId])
      if (existing.rows[0]?.locked) throw new Error('LOCKED')
      await client.query(
        `UPDATE haccp_daily_checks SET
          location=$2, main_worker_id=$3, main_worker_name=$4,
          assistant_worker_name=$5, notes=$6, updated_at=now(),
          status=$7, completed_at=$8, completed_by=$9, locked=$10
         WHERE id=$1`,
        [
          checkId,
          params.location ?? null,
          params.mainWorkerId ?? null,
          params.mainWorkerName ?? null,
          params.assistantWorkerName ?? null,
          params.notes ?? null,
          params.complete ? 'completed' : 'draft',
          params.complete ? new Date() : null,
          params.complete ? params.completedById ?? null : null,
          params.complete ?? false,
        ]
      )
    } else {
      const r = await client.query(
        `INSERT INTO haccp_daily_checks (check_date, check_type, location, main_worker_id, main_worker_name, assistant_worker_name, notes, status, completed_at, completed_by, locked)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [
          params.checkDate,
          params.checkType,
          params.location ?? null,
          params.mainWorkerId ?? null,
          params.mainWorkerName ?? null,
          params.assistantWorkerName ?? null,
          params.notes ?? null,
          params.complete ? 'completed' : 'draft',
          params.complete ? new Date() : null,
          params.complete ? params.completedById ?? null : null,
          params.complete ?? false,
        ]
      )
      checkId = r.rows[0].id
    }

    await client.query(`DELETE FROM haccp_daily_check_items WHERE check_id=$1`, [checkId])
    for (const item of params.items) {
      await client.query(
        `INSERT INTO haccp_daily_check_items (check_id, item_key, item_label, result, note, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [checkId, item.key, item.label, item.result, item.note ?? null, item.order]
      )
    }

    await client.query('COMMIT')
    return checkId as string
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// ─── Temperature records ──────────────────────────────────────────────────────

export async function getTemperatureRecords(params: { from: string; to: string }) {
  const r = await pool.query(
    `SELECT * FROM haccp_temperature_records WHERE record_date BETWEEN $1 AND $2 ORDER BY record_date DESC, created_at DESC`,
    [params.from, params.to]
  )
  return r.rows
}

export async function insertTemperatureRecord(params: {
  recordDate: string
  recordTime?: string
  equipmentId?: string | null
  equipmentName: string
  measuredTemp: number
  tempMin?: number | null
  tempMax?: number | null
  employeeId?: string | null
  employeeName?: string
  correctiveAction?: string
  notes?: string
}) {
  const result = params.tempMin == null && params.tempMax == null ? 'unconfigured'
    : params.measuredTemp < (params.tempMin ?? -Infinity) ? 'below_limit'
    : params.measuredTemp > (params.tempMax ?? Infinity) ? 'above_limit'
    : 'ok'

  const r = await pool.query(
    `INSERT INTO haccp_temperature_records
      (record_date, record_time, equipment_id, equipment_name, measured_temp, temp_min, temp_max, result, employee_id, employee_name, corrective_action, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [
      params.recordDate,
      params.recordTime ?? null,
      params.equipmentId ?? null,
      params.equipmentName,
      params.measuredTemp,
      params.tempMin ?? null,
      params.tempMax ?? null,
      result,
      params.employeeId ?? null,
      params.employeeName ?? null,
      params.correctiveAction ?? null,
      params.notes ?? null,
    ]
  )
  return r.rows[0]
}

export async function getEquipment() {
  const r = await pool.query(`SELECT * FROM haccp_equipment WHERE active=true ORDER BY sort_order, name`)
  return r.rows
}

// ─── Sanitation ───────────────────────────────────────────────────────────────

export async function getSanitationRecords(params: { from: string; to: string }) {
  const r = await pool.query(
    `SELECT * FROM haccp_sanitation_records WHERE record_date BETWEEN $1 AND $2 ORDER BY record_date DESC, created_at DESC`,
    [params.from, params.to]
  )
  return r.rows
}

export async function insertSanitationRecord(params: {
  recordDate: string
  recordTime?: string
  area: string
  cleaningAction?: string
  productUsed?: string
  concentration?: string
  employeeId?: string | null
  employeeName?: string
  result: 'ok' | 'nok' | 'partial'
  notes?: string
}) {
  const r = await pool.query(
    `INSERT INTO haccp_sanitation_records
      (record_date, record_time, area, cleaning_action, product_used, concentration, employee_id, employee_name, result, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      params.recordDate, params.recordTime ?? null, params.area,
      params.cleaningAction ?? null, params.productUsed ?? null,
      params.concentration ?? null, params.employeeId ?? null,
      params.employeeName ?? null, params.result, params.notes ?? null,
    ]
  )
  return r.rows[0]
}

// ─── Water ────────────────────────────────────────────────────────────────────

export async function getWaterRecords(params: { from: string; to: string }) {
  const r = await pool.query(
    `SELECT * FROM haccp_water_records WHERE record_date BETWEEN $1 AND $2 ORDER BY record_date DESC`,
    [params.from, params.to]
  )
  return r.rows
}

export async function insertWaterRecord(params: {
  recordDate: string
  location?: string
  waterSource?: string
  amountFilledL?: number | null
  cleanTankChecked: boolean
  cleanTankSanitized: boolean
  wasteTankChecked: boolean
  wasteDisposed: boolean
  disposalLocation?: string
  employeeId?: string | null
  employeeName?: string
  notes?: string
}) {
  const r = await pool.query(
    `INSERT INTO haccp_water_records
      (record_date, location, water_source, amount_filled_l, clean_tank_checked, clean_tank_sanitized, waste_tank_checked, waste_disposed, disposal_location, employee_id, employee_name, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [
      params.recordDate, params.location ?? null, params.waterSource ?? null,
      params.amountFilledL ?? null, params.cleanTankChecked, params.cleanTankSanitized,
      params.wasteTankChecked, params.wasteDisposed, params.disposalLocation ?? null,
      params.employeeId ?? null, params.employeeName ?? null, params.notes ?? null,
    ]
  )
  return r.rows[0]
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export async function getSuppliers(activeOnly = false) {
  const r = await pool.query(
    `SELECT * FROM haccp_suppliers${activeOnly ? ' WHERE active=true' : ''} ORDER BY name`
  )
  return r.rows
}

export async function upsertSupplier(params: {
  id?: string
  name: string
  legalName?: string
  ico?: string
  address?: string
  contactPerson?: string
  email?: string
  phone?: string
  categories?: string[]
  approved?: boolean
  active?: boolean
  notes?: string
}) {
  if (params.id) {
    const r = await pool.query(
      `UPDATE haccp_suppliers SET name=$2, legal_name=$3, ico=$4, address=$5, contact_person=$6,
        email=$7, phone=$8, categories=$9, approved=$10, active=$11, notes=$12, updated_at=now()
       WHERE id=$1 RETURNING *`,
      [params.id, params.name, params.legalName ?? null, params.ico ?? null, params.address ?? null,
       params.contactPerson ?? null, params.email ?? null, params.phone ?? null,
       params.categories ?? [], params.approved ?? false, params.active ?? true, params.notes ?? null]
    )
    return r.rows[0]
  } else {
    const r = await pool.query(
      `INSERT INTO haccp_suppliers (name, legal_name, ico, address, contact_person, email, phone, categories, approved, active, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [params.name, params.legalName ?? null, params.ico ?? null, params.address ?? null,
       params.contactPerson ?? null, params.email ?? null, params.phone ?? null,
       params.categories ?? [], params.approved ?? false, params.active ?? true, params.notes ?? null]
    )
    return r.rows[0]
  }
}

// ─── Receiving ────────────────────────────────────────────────────────────────

export async function getReceivingRecords(params: { from: string; to: string }) {
  const r = await pool.query(
    `SELECT * FROM haccp_receiving_records WHERE received_at BETWEEN $1 AND $2::date + interval '1 day' ORDER BY received_at DESC`,
    [params.from, params.to]
  )
  return r.rows
}

export async function insertReceivingRecord(params: {
  receivedAt?: string
  supplierId?: string | null
  supplierName?: string
  product: string
  quantity?: string
  lotBatch?: string
  expiryDate?: string | null
  temperature?: number | null
  packageCondition: 'ok' | 'damaged' | 'rejected'
  accepted: boolean
  rejectionReason?: string
  receivedById?: string | null
  receivedByName?: string
  invoiceRef?: string
  notes?: string
}) {
  const r = await pool.query(
    `INSERT INTO haccp_receiving_records
      (received_at, supplier_id, supplier_name, product, quantity, lot_batch, expiry_date, temperature,
       package_condition, accepted, rejection_reason, received_by_id, received_by_name, invoice_ref, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
    [
      params.receivedAt ?? new Date(), params.supplierId ?? null, params.supplierName ?? null,
      params.product, params.quantity ?? null, params.lotBatch ?? null,
      params.expiryDate ?? null, params.temperature ?? null,
      params.packageCondition, params.accepted, params.rejectionReason ?? null,
      params.receivedById ?? null, params.receivedByName ?? null,
      params.invoiceRef ?? null, params.notes ?? null,
    ]
  )
  return r.rows[0]
}

// ─── Discards ─────────────────────────────────────────────────────────────────

export async function getDiscardRecords(params: { from: string; to: string }) {
  const r = await pool.query(
    `SELECT * FROM haccp_discard_records WHERE record_date BETWEEN $1 AND $2 ORDER BY record_date DESC`,
    [params.from, params.to]
  )
  return r.rows
}

export async function insertDiscardRecord(params: {
  recordDate: string
  product: string
  quantity?: string
  reason: string
  expiryDate?: string | null
  disposalMethod?: string
  employeeId?: string | null
  employeeName?: string
  notes?: string
}) {
  const r = await pool.query(
    `INSERT INTO haccp_discard_records (record_date, product, quantity, reason, expiry_date, disposal_method, employee_id, employee_name, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      params.recordDate, params.product, params.quantity ?? null, params.reason,
      params.expiryDate ?? null, params.disposalMethod ?? null,
      params.employeeId ?? null, params.employeeName ?? null, params.notes ?? null,
    ]
  )
  return r.rows[0]
}

// ─── Non-conformities ─────────────────────────────────────────────────────────

export async function getNonConformities(params: { status?: string; from?: string; to?: string }) {
  const conditions: string[] = ['archived=false']
  const values: (string | number)[] = []
  if (params.status) { conditions.push(`status=$${values.length + 1}`); values.push(params.status) }
  if (params.from) { conditions.push(`discovered_at >= $${values.length + 1}`); values.push(params.from) }
  if (params.to) { conditions.push(`discovered_at <= $${values.length + 1}::date + interval '1 day'`); values.push(params.to) }
  const r = await pool.query(
    `SELECT * FROM haccp_non_conformities WHERE ${conditions.join(' AND ')} ORDER BY discovered_at DESC`,
    values
  )
  return r.rows
}

export async function upsertNonConformity(params: {
  id?: string
  discoveredAt?: string
  category: string
  description: string
  affectedProduct?: string
  lotBatch?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  immediateAction?: string
  correctiveAction?: string
  responsibleId?: string | null
  responsibleName?: string
  status?: string
  closedAt?: string | null
  closureNote?: string
  source?: string
  sourceRecordId?: string | null
}) {
  if (params.id) {
    const r = await pool.query(
      `UPDATE haccp_non_conformities SET category=$2, description=$3, affected_product=$4, lot_batch=$5,
        severity=$6, immediate_action=$7, corrective_action=$8, responsible_id=$9, responsible_name=$10,
        status=$11, closed_at=$12, closure_note=$13, updated_at=now()
       WHERE id=$1 AND archived=false RETURNING *`,
      [params.id, params.category, params.description, params.affectedProduct ?? null,
       params.lotBatch ?? null, params.severity, params.immediateAction ?? null,
       params.correctiveAction ?? null, params.responsibleId ?? null, params.responsibleName ?? null,
       params.status ?? 'open', params.closedAt ?? null, params.closureNote ?? null]
    )
    return r.rows[0]
  } else {
    const r = await pool.query(
      `INSERT INTO haccp_non_conformities
        (discovered_at, category, description, affected_product, lot_batch, severity, immediate_action,
         corrective_action, responsible_id, responsible_name, status, source, source_record_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        params.discoveredAt ?? new Date(), params.category, params.description,
        params.affectedProduct ?? null, params.lotBatch ?? null, params.severity,
        params.immediateAction ?? null, params.correctiveAction ?? null,
        params.responsibleId ?? null, params.responsibleName ?? null,
        params.status ?? 'open', params.source ?? null, params.sourceRecordId ?? null,
      ]
    )
    return r.rows[0]
  }
}

// ─── Pest control ─────────────────────────────────────────────────────────────

export async function getPestControlRecords(params: { from: string; to: string }) {
  const r = await pool.query(
    `SELECT * FROM haccp_pest_control_records WHERE record_date BETWEEN $1 AND $2 ORDER BY record_date DESC`,
    [params.from, params.to]
  )
  return r.rows
}

export async function insertPestControlRecord(params: {
  recordDate: string
  area: string
  finding?: string
  evidenceFound: boolean
  actionTaken?: string
  responsibleId?: string | null
  responsibleName?: string
  status: 'inspected' | 'action_required' | 'closed'
  closedDate?: string | null
  notes?: string
}) {
  const r = await pool.query(
    `INSERT INTO haccp_pest_control_records (record_date, area, finding, evidence_found, action_taken, responsible_id, responsible_name, status, closed_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      params.recordDate, params.area, params.finding ?? null, params.evidenceFound,
      params.actionTaken ?? null, params.responsibleId ?? null, params.responsibleName ?? null,
      params.status, params.closedDate ?? null, params.notes ?? null,
    ]
  )
  return r.rows[0]
}

// ─── Maintenance ──────────────────────────────────────────────────────────────

export async function getMaintenanceRecords(params: { from: string; to: string }) {
  const r = await pool.query(
    `SELECT * FROM haccp_maintenance_records WHERE record_date BETWEEN $1 AND $2 ORDER BY record_date DESC`,
    [params.from, params.to]
  )
  return r.rows
}

export async function insertMaintenanceRecord(params: {
  recordDate: string
  equipment: string
  description: string
  performedBy?: string
  result?: string
  nextServiceDate?: string | null
  notes?: string
}) {
  const r = await pool.query(
    `INSERT INTO haccp_maintenance_records (record_date, equipment, description, performed_by, result, next_service_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      params.recordDate, params.equipment, params.description,
      params.performedBy ?? null, params.result ?? null,
      params.nextServiceDate ?? null, params.notes ?? null,
    ]
  )
  return r.rows[0]
}

// ─── Ingredients ──────────────────────────────────────────────────────────────

export async function getIngredients(activeOnly = false) {
  const r = await pool.query(
    `SELECT i.*, COALESCE(json_agg(ia.*) FILTER (WHERE ia.id IS NOT NULL), '[]') as allergens
     FROM haccp_ingredients i
     LEFT JOIN haccp_ingredient_allergens ia ON ia.ingredient_id = i.id
     ${activeOnly ? 'WHERE i.active=true' : ''}
     GROUP BY i.id ORDER BY i.name`
  )
  return r.rows
}

export async function upsertIngredient(params: {
  id?: string
  name: string
  brand?: string
  supplierId?: string | null
  supplierName?: string
  category: string
  storageRequirement?: string
  storageAfterOpening?: string
  expiryRule?: string
  active?: boolean
  notes?: string
  allergens?: Array<{ allergenNumber: number; presence: 'contains' | 'may_contain' | 'free'; notes?: string }>
}) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    let ingId = params.id

    if (ingId) {
      await client.query(
        `UPDATE haccp_ingredients SET name=$2, brand=$3, supplier_id=$4, supplier_name=$5, category=$6,
          storage_requirement=$7, storage_after_opening=$8, expiry_rule=$9, active=$10, notes=$11, updated_at=now()
         WHERE id=$1`,
        [ingId, params.name, params.brand ?? null, params.supplierId ?? null, params.supplierName ?? null,
         params.category, params.storageRequirement ?? null, params.storageAfterOpening ?? null,
         params.expiryRule ?? null, params.active ?? true, params.notes ?? null]
      )
    } else {
      const r = await client.query(
        `INSERT INTO haccp_ingredients (name, brand, supplier_id, supplier_name, category, storage_requirement, storage_after_opening, expiry_rule, active, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [params.name, params.brand ?? null, params.supplierId ?? null, params.supplierName ?? null,
         params.category, params.storageRequirement ?? null, params.storageAfterOpening ?? null,
         params.expiryRule ?? null, params.active ?? true, params.notes ?? null]
      )
      ingId = r.rows[0].id
    }

    if (params.allergens !== undefined) {
      await client.query(`DELETE FROM haccp_ingredient_allergens WHERE ingredient_id=$1`, [ingId])
      for (const a of params.allergens) {
        if (a.presence !== 'free') {
          await client.query(
            `INSERT INTO haccp_ingredient_allergens (ingredient_id, allergen_number, presence, notes)
             VALUES ($1,$2,$3,$4)`,
            [ingId, a.allergenNumber, a.presence, a.notes ?? null]
          )
        }
      }
    }

    await client.query('COMMIT')
    return ingId as string
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// ─── Recipes ──────────────────────────────────────────────────────────────────

export async function getRecipes(activeOnly = false) {
  const r = await pool.query(
    `SELECT r.*,
       COALESCE(json_agg(ri.* ORDER BY ri.sort_order) FILTER (WHERE ri.id IS NOT NULL), '[]') as ingredients
     FROM haccp_recipes r
     LEFT JOIN haccp_recipe_ingredients ri ON ri.recipe_id = r.id
     ${activeOnly ? 'WHERE r.active=true' : ''}
     GROUP BY r.id ORDER BY r.category NULLS LAST, r.name`
  )
  return r.rows
}

export async function upsertRecipe(params: {
  id?: string
  name: string
  category?: string
  servingSize?: string
  preparationNotes?: string
  active?: boolean
  ingredients?: Array<{ ingredientId?: string | null; ingredientName: string; quantity?: string; sortOrder: number }>
}) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    let recipeId = params.id

    if (recipeId) {
      await client.query(
        `UPDATE haccp_recipes SET name=$2, category=$3, serving_size=$4, preparation_notes=$5, active=$6, updated_at=now()
         WHERE id=$1`,
        [recipeId, params.name, params.category ?? null, params.servingSize ?? null,
         params.preparationNotes ?? null, params.active ?? true]
      )
    } else {
      const r = await client.query(
        `INSERT INTO haccp_recipes (name, category, serving_size, preparation_notes, active)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [params.name, params.category ?? null, params.servingSize ?? null,
         params.preparationNotes ?? null, params.active ?? true]
      )
      recipeId = r.rows[0].id
    }

    if (params.ingredients !== undefined) {
      await client.query(`DELETE FROM haccp_recipe_ingredients WHERE recipe_id=$1`, [recipeId])
      for (const ing of params.ingredients) {
        await client.query(
          `INSERT INTO haccp_recipe_ingredients (recipe_id, ingredient_id, ingredient_name, quantity, sort_order)
           VALUES ($1,$2,$3,$4,$5)`,
          [recipeId, ing.ingredientId ?? null, ing.ingredientName, ing.quantity ?? null, ing.sortOrder]
        )
      }
    }

    await client.query('COMMIT')
    return recipeId as string
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// ─── Allergen matrix ──────────────────────────────────────────────────────────

export async function getAllergenMatrix() {
  const recipes = await pool.query(
    `SELECT r.id, r.name, r.category, r.allergen_override, r.allergen_override_reason, r.allergen_override_at,
       COALESCE(json_agg(
         json_build_object('ingredient_id', ri.ingredient_id, 'ingredient_name', ri.ingredient_name)
       ) FILTER (WHERE ri.id IS NOT NULL), '[]') as ingredients
     FROM haccp_recipes r
     LEFT JOIN haccp_recipe_ingredients ri ON ri.recipe_id = r.id
     WHERE r.active=true GROUP BY r.id ORDER BY r.category NULLS LAST, r.name`
  )

  const allergens = await pool.query(
    `SELECT ia.ingredient_id, ia.allergen_number, ia.presence
     FROM haccp_ingredient_allergens ia
     JOIN haccp_ingredients i ON i.id = ia.ingredient_id
     WHERE i.active=true`
  )

  const allergenMap = new Map<string, Map<number, string>>()
  for (const a of allergens.rows) {
    if (!allergenMap.has(a.ingredient_id)) allergenMap.set(a.ingredient_id, new Map())
    allergenMap.get(a.ingredient_id)!.set(a.allergen_number, a.presence)
  }

  return recipes.rows.map(recipe => {
    const derived: Record<number, string> = {}
    for (const ing of recipe.ingredients as Array<{ ingredient_id: string | null }>) {
      if (!ing.ingredient_id) continue
      const ingAllergens = allergenMap.get(ing.ingredient_id)
      if (!ingAllergens) continue
      for (const [num, presence] of ingAllergens) {
        if (presence === 'contains' || derived[num] !== 'contains') {
          derived[num] = presence
        }
      }
    }
    const override = recipe.allergen_override as Record<string, string> | null
    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      category: recipe.category,
      derived,
      override: override ?? {},
      overrideReason: recipe.allergen_override_reason,
      overrideAt: recipe.allergen_override_at,
    }
  })
}

export async function setAllergenOverride(params: {
  recipeId: string
  override: Record<string, string>
  reason: string
  userId: string
  userName: string
}) {
  await pool.query(
    `UPDATE haccp_recipes SET allergen_override=$2, allergen_override_reason=$3,
      allergen_override_by=$4, allergen_override_at=now() WHERE id=$1`,
    [params.recipeId, JSON.stringify(params.override), params.reason, params.userId]
  )
  await logHaccpAudit({
    entityType: 'recipe',
    entityId: params.recipeId,
    action: 'allergen_override',
    userId: params.userId,
    userName: params.userName,
    newValues: params.override,
    reason: params.reason,
  })
}

// ─── Training ─────────────────────────────────────────────────────────────────

export async function getTrainingRecords(params?: { employeeId?: string }) {
  const conditions: string[] = []
  const values: string[] = []
  if (params?.employeeId) { conditions.push(`employee_id=$1`); values.push(params.employeeId) }
  const r = await pool.query(
    `SELECT * FROM haccp_training_records${conditions.length ? ' WHERE '+conditions.join(' AND ') : ''} ORDER BY training_date DESC`,
    values
  )
  return r.rows
}

export async function insertTrainingRecord(params: {
  employeeId?: string | null
  employeeName: string
  topic: string
  trainingDate: string
  trainer?: string
  confirmed?: boolean
  confirmedById?: string | null
  nextRetrainingDate?: string | null
  notes?: string
}) {
  const r = await pool.query(
    `INSERT INTO haccp_training_records
      (employee_id, employee_name, topic, training_date, trainer, confirmed, confirmed_by_id, confirmed_at, next_retraining_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      params.employeeId ?? null, params.employeeName, params.topic, params.trainingDate,
      params.trainer ?? null, params.confirmed ?? false,
      params.confirmedById ?? null, params.confirmed ? new Date() : null,
      params.nextRetrainingDate ?? null, params.notes ?? null,
    ]
  )
  return r.rows[0]
}

export async function confirmTraining(id: string, userId: string, userName: string) {
  const r = await pool.query(
    `UPDATE haccp_training_records SET confirmed=true, confirmed_by_id=$2, confirmed_at=now()
     WHERE id=$1 AND confirmed=false RETURNING *`,
    [id, userId]
  )
  if (r.rows[0]) {
    await logHaccpAudit({
      entityType: 'training',
      entityId: id,
      action: 'training_confirmed',
      userId,
      userName,
    })
  }
  return r.rows[0]
}

// ─── Manual versions ──────────────────────────────────────────────────────────

export async function getManualVersions() {
  const r = await pool.query(`SELECT * FROM haccp_manual_versions ORDER BY created_at DESC`)
  return r.rows
}

export async function upsertManualVersion(params: {
  id?: string
  version: string
  title: string
  issueDate?: string | null
  effectiveDate?: string | null
  status: 'draft' | 'review' | 'active' | 'archived'
  documentUrl?: string
  approvedBy?: string
  ruvStatus: 'unconsulted' | 'consulted' | 'requires_update' | 'approved'
  notes?: string
  createdBy?: string | null
}) {
  if (params.id) {
    const r = await pool.query(
      `UPDATE haccp_manual_versions SET version=$2, title=$3, issue_date=$4, effective_date=$5,
        status=$6, document_url=$7, approved_by=$8, ruv_status=$9, notes=$10, updated_at=now()
       WHERE id=$1 RETURNING *`,
      [params.id, params.version, params.title, params.issueDate ?? null, params.effectiveDate ?? null,
       params.status, params.documentUrl ?? null, params.approvedBy ?? null,
       params.ruvStatus, params.notes ?? null]
    )
    return r.rows[0]
  } else {
    const r = await pool.query(
      `INSERT INTO haccp_manual_versions (version, title, issue_date, effective_date, status, document_url, approved_by, ruv_status, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [params.version, params.title, params.issueDate ?? null, params.effectiveDate ?? null,
       params.status, params.documentUrl ?? null, params.approvedBy ?? null,
       params.ruvStatus, params.notes ?? null, params.createdBy ?? null]
    )
    return r.rows[0]
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getHaccpSettings(): Promise<Record<string, unknown>> {
  const r = await pool.query(`SELECT key, value FROM haccp_settings`)
  const out: Record<string, unknown> = {}
  for (const row of r.rows) out[row.key] = row.value
  return out
}

export async function setHaccpSetting(key: string, value: unknown, userId?: string | null): Promise<void> {
  await pool.query(
    `INSERT INTO haccp_settings (key, value, updated_by, updated_at) VALUES ($1,$2,$3,now())
     ON CONFLICT (key) DO UPDATE SET value=$2, updated_by=$3, updated_at=now()`,
    [key, JSON.stringify(value), userId ?? null]
  )
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export async function getHaccpAuditLog(params: { entityType?: string; entityId?: string; limit?: number }) {
  const conditions: string[] = []
  const values: string[] = []
  if (params.entityType) { conditions.push(`entity_type=$${values.length+1}`); values.push(params.entityType) }
  if (params.entityId) { conditions.push(`entity_id=$${values.length+1}`); values.push(params.entityId) }
  const r = await pool.query(
    `SELECT * FROM haccp_audit_log${conditions.length ? ' WHERE '+conditions.join(' AND ') : ''} ORDER BY created_at DESC LIMIT $${values.length+1}`,
    [...values, params.limit ?? 100]
  )
  return r.rows
}
