import { pool } from './db'
import {
  ABSENCE_TYPES,
  type EntryType,
  type ShiftStatus,
} from './shifts'
import {
  CATEGORY_LABELS,
  POINT_CATEGORIES,
  POINT_SOURCES,
  type PointCategory,
  type PointEventStatus,
  type PointSource,
} from './motivation'
import { INVENTORY_KINDS, MOVEMENT_TYPES, type MovementType } from './inventory'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type ReportType = 'shifts' | 'absences' | 'points' | 'inventory' | 'users'

export const REPORT_TYPES: ReportType[] = ['shifts', 'absences', 'points', 'inventory', 'users']

/** Slovak filename slug used in the exported file name. */
export const REPORT_SLUGS: Record<ReportType, string> = {
  shifts: 'zmeny',
  absences: 'nepritomnosti',
  points: 'zlate-body',
  inventory: 'skladove-pohyby',
  users: 'pouzivatelia',
}

/** Sheet / title labels (Slovak) per report. */
export const REPORT_TITLES: Record<ReportType, string> = {
  shifts: 'Zmeny a odpracované hodiny',
  absences: 'Neprítomnosti',
  points: 'Zlaté body',
  inventory: 'Skladové pohyby',
  users: 'Používatelia',
}

const num = (v: string | null | undefined): number | null => {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Computes hours between two HH:MM(:SS) times. Handles a single overnight wrap. */
function hoursBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const toMin = (t: string) => {
    const [h, m] = t.split(':')
    return Number(h) * 60 + Number(m)
  }
  let diff = toMin(end) - toMin(start)
  if (diff < 0) diff += 24 * 60 // crossed midnight
  return round2(diff / 60)
}

function dayCountInclusive(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`)
  const b = Date.parse(`${to}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 1
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1)
}

// ---------------------------------------------------------------------------
// Shifts report
// ---------------------------------------------------------------------------

export interface ShiftReportFilters {
  from?: string
  to?: string
  staffUserId?: string
  status?: ShiftStatus
  location?: string
}

export interface ShiftReportRow {
  employeeName: string
  employeeEmail: string
  date: string
  startTime: string | null
  endTime: string | null
  hoursWorked: number | null
  location: string
  position: string
  status: ShiftStatus
  note: string
  createdAt: string
  updatedAt: string
}

export interface ShiftReportSummaryRow {
  employeeName: string
  employeeEmail: string
  totalShifts: number
  totalHours: number
  cancelledShifts: number
}

export interface ShiftReport {
  rows: ShiftReportRow[]
  summary: ShiftReportSummaryRow[]
}

export async function getShiftReport(filters: ShiftReportFilters): Promise<ShiftReport> {
  const clauses: string[] = [`s.entry_type = 'work_shift'`]
  const params: unknown[] = []

  if (filters.to) {
    params.push(filters.to)
    clauses.push(`s.start_date <= $${params.length}`)
  }
  if (filters.from) {
    params.push(filters.from)
    clauses.push(`s.end_date >= $${params.length}`)
  }
  if (filters.staffUserId) {
    params.push(filters.staffUserId)
    clauses.push(`s.staff_user_id = $${params.length}`)
  }
  if (filters.status) {
    params.push(filters.status)
    clauses.push(`s.status = $${params.length}`)
  }
  if (filters.location) {
    params.push(`%${filters.location.trim().toLowerCase()}%`)
    clauses.push(`lower(coalesce(s.location,'')) LIKE $${params.length}`)
  }

  const result = await pool.query<{
    staff_name: string
    staff_email: string
    start_date: string
    start_time: string | null
    end_time: string | null
    location: string | null
    position: string | null
    status: ShiftStatus
    notes: string | null
    created_at: Date
    updated_at: Date
  }>(
    `SELECT u.name AS staff_name, u.email AS staff_email,
            to_char(s.start_date,'YYYY-MM-DD') AS start_date,
            s.start_time, s.end_time, s.location, s.position, s.status, s.notes,
            s.created_at, s.updated_at
     FROM work_shifts s
     JOIN admin_users u ON u.id = s.staff_user_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY u.name ASC, s.start_date ASC, s.start_time ASC NULLS FIRST`,
    params,
  )

  const rows: ShiftReportRow[] = result.rows.map((r) => ({
    employeeName: r.staff_name,
    employeeEmail: r.staff_email,
    date: r.start_date,
    startTime: r.start_time ? r.start_time.slice(0, 5) : null,
    endTime: r.end_time ? r.end_time.slice(0, 5) : null,
    hoursWorked:
      r.status === 'cancelled' ? 0 : hoursBetween(r.start_time?.slice(0, 5) ?? null, r.end_time?.slice(0, 5) ?? null),
    location: r.location ?? '',
    position: r.position ?? '',
    status: r.status,
    note: r.notes ?? '',
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  }))

  const summaryMap = new Map<string, ShiftReportSummaryRow>()
  for (const row of rows) {
    const key = row.employeeEmail
    const existing =
      summaryMap.get(key) ??
      { employeeName: row.employeeName, employeeEmail: row.employeeEmail, totalShifts: 0, totalHours: 0, cancelledShifts: 0 }
    existing.totalShifts += 1
    if (row.status === 'cancelled') existing.cancelledShifts += 1
    else existing.totalHours = round2(existing.totalHours + (row.hoursWorked ?? 0))
    summaryMap.set(key, existing)
  }

  return { rows, summary: [...summaryMap.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName)) }
}

// ---------------------------------------------------------------------------
// Absences report
// ---------------------------------------------------------------------------

export interface AbsenceReportFilters {
  from?: string
  to?: string
  staffUserId?: string
  entryType?: EntryType
  status?: ShiftStatus
}

export interface AbsenceReportRow {
  employeeName: string
  employeeEmail: string
  absenceType: EntryType
  dateFrom: string
  dateTo: string
  daysCount: number
  allDay: boolean
  status: ShiftStatus
  note: string
  createdAt: string
  updatedAt: string
}

export const ABSENCE_TYPE_LABELS: Record<EntryType, string> = {
  work_shift: 'Pracovná zmena',
  vacation: 'Dovolenka',
  sick_leave: 'PN / Choroba',
  unavailable: 'Nedostupný',
  training: 'Školenie',
  other: 'Iné',
}

export async function getAbsenceReport(filters: AbsenceReportFilters): Promise<AbsenceReportRow[]> {
  // Only absence entry types; honour a specific type only when it is an absence type.
  const types =
    filters.entryType && ABSENCE_TYPES.includes(filters.entryType) ? [filters.entryType] : ABSENCE_TYPES
  const clauses: string[] = []
  const params: unknown[] = []

  params.push(types)
  clauses.push(`s.entry_type = ANY($${params.length})`)

  if (filters.to) {
    params.push(filters.to)
    clauses.push(`s.start_date <= $${params.length}`)
  }
  if (filters.from) {
    params.push(filters.from)
    clauses.push(`s.end_date >= $${params.length}`)
  }
  if (filters.staffUserId) {
    params.push(filters.staffUserId)
    clauses.push(`s.staff_user_id = $${params.length}`)
  }
  if (filters.status) {
    params.push(filters.status)
    clauses.push(`s.status = $${params.length}`)
  }

  const result = await pool.query<{
    staff_name: string
    staff_email: string
    entry_type: EntryType
    start_date: string
    end_date: string
    all_day: boolean
    status: ShiftStatus
    notes: string | null
    created_at: Date
    updated_at: Date
  }>(
    `SELECT u.name AS staff_name, u.email AS staff_email, s.entry_type,
            to_char(s.start_date,'YYYY-MM-DD') AS start_date,
            to_char(s.end_date,'YYYY-MM-DD') AS end_date,
            s.all_day, s.status, s.notes, s.created_at, s.updated_at
     FROM work_shifts s
     JOIN admin_users u ON u.id = s.staff_user_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY u.name ASC, s.start_date ASC`,
    params,
  )

  return result.rows.map((r) => ({
    employeeName: r.staff_name,
    employeeEmail: r.staff_email,
    absenceType: r.entry_type,
    dateFrom: r.start_date,
    dateTo: r.end_date,
    daysCount: dayCountInclusive(r.start_date, r.end_date),
    allDay: r.all_day,
    status: r.status,
    note: r.notes ?? '',
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  }))
}

// ---------------------------------------------------------------------------
// Golden Points report
// ---------------------------------------------------------------------------

export interface PointsReportFilters {
  from?: string
  to?: string
  staffUserId?: string
  category?: PointCategory
  source?: PointSource
  status?: PointEventStatus
}

export interface PointsReportRow {
  employeeName: string
  employeeEmail: string
  happenedAt: string
  category: PointCategory
  categoryLabel: string
  source: PointSource
  ruleOrProduct: string
  quantity: number
  pointsPerUnit: number
  totalPoints: number
  status: PointEventStatus
  note: string
  createdByName: string
  createdAt: string
}

export interface PointsReportSummaryRow {
  employeeName: string
  employeeEmail: string
  totalPoints: number
  events: number
}

export interface PointsReport {
  rows: PointsReportRow[]
  summary: PointsReportSummaryRow[]
}

export async function getPointsReport(filters: PointsReportFilters): Promise<PointsReport> {
  const clauses: string[] = []
  const params: unknown[] = []

  if (filters.from) {
    params.push(`${filters.from}T00:00:00.000Z`)
    clauses.push(`e.happened_at >= $${params.length}`)
  }
  if (filters.to) {
    params.push(`${filters.to}T23:59:59.999Z`)
    clauses.push(`e.happened_at <= $${params.length}`)
  }
  if (filters.staffUserId) {
    params.push(filters.staffUserId)
    clauses.push(`e.staff_user_id = $${params.length}`)
  }
  if (filters.category) {
    params.push(filters.category)
    clauses.push(`e.category = $${params.length}`)
  }
  if (filters.source) {
    params.push(filters.source)
    clauses.push(`e.source = $${params.length}`)
  }
  if (filters.status) {
    params.push(filters.status)
    clauses.push(`e.status = $${params.length}`)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const result = await pool.query<{
    staff_name: string | null
    staff_email: string | null
    happened_at: Date
    category: PointCategory
    source: PointSource
    rule_name: string | null
    product_name: string | null
    quantity: string
    points_per_unit: string
    total_points: string
    status: PointEventStatus
    note: string | null
    created_by_name: string | null
    created_at: Date
  }>(
    `SELECT su.name AS staff_name, su.email AS staff_email, e.happened_at,
            e.category, e.source, r.name AS rule_name, e.product_name,
            e.quantity, e.points_per_unit, e.total_points, e.status, e.note,
            cu.name AS created_by_name, e.created_at
     FROM motivation_point_events e
     LEFT JOIN admin_users su ON su.id = e.staff_user_id
     LEFT JOIN admin_users cu ON cu.id = e.created_by
     LEFT JOIN motivation_point_rules r ON r.id = e.rule_id
     ${where}
     ORDER BY su.name ASC, e.happened_at ASC`,
    params,
  )

  const rows: PointsReportRow[] = result.rows.map((r) => ({
    employeeName: r.staff_name ?? '—',
    employeeEmail: r.staff_email ?? '',
    happenedAt: r.happened_at.toISOString(),
    category: r.category,
    categoryLabel: CATEGORY_LABELS[r.category] ?? r.category,
    source: r.source,
    ruleOrProduct: r.rule_name ?? r.product_name ?? '',
    quantity: num(r.quantity) ?? 0,
    pointsPerUnit: num(r.points_per_unit) ?? 0,
    totalPoints: num(r.total_points) ?? 0,
    status: r.status,
    note: r.note ?? '',
    createdByName: r.created_by_name ?? '',
    createdAt: r.created_at.toISOString(),
  }))

  const summaryMap = new Map<string, PointsReportSummaryRow>()
  for (const row of rows) {
    if (row.status !== 'active') continue
    const key = row.employeeEmail || row.employeeName
    const existing =
      summaryMap.get(key) ?? { employeeName: row.employeeName, employeeEmail: row.employeeEmail, totalPoints: 0, events: 0 }
    existing.totalPoints = round2(existing.totalPoints + row.totalPoints)
    existing.events += 1
    summaryMap.set(key, existing)
  }

  return { rows, summary: [...summaryMap.values()].sort((a, b) => b.totalPoints - a.totalPoints) }
}

// ---------------------------------------------------------------------------
// Inventory movements report
// ---------------------------------------------------------------------------

export interface InventoryReportFilters {
  from?: string
  to?: string
  itemId?: string
  movementType?: MovementType
  createdBy?: string
}

export interface InventoryReportRow {
  happenedAt: string
  itemCode: string
  itemName: string
  inventoryKind: string
  movementType: MovementType
  quantityChange: number
  unitPriceWithoutVat: number | null
  vatRate: number | null
  unitPriceWithVat: number | null
  note: string
  createdByName: string
}

export async function getInventoryReport(filters: InventoryReportFilters): Promise<InventoryReportRow[]> {
  const clauses: string[] = []
  const params: unknown[] = []

  if (filters.from) {
    params.push(`${filters.from}T00:00:00.000Z`)
    clauses.push(`m.created_at >= $${params.length}`)
  }
  if (filters.to) {
    params.push(`${filters.to}T23:59:59.999Z`)
    clauses.push(`m.created_at <= $${params.length}`)
  }
  if (filters.itemId) {
    params.push(filters.itemId)
    clauses.push(`m.item_id = $${params.length}`)
  }
  if (filters.movementType) {
    params.push(filters.movementType)
    clauses.push(`m.movement_type = $${params.length}`)
  }
  if (filters.createdBy) {
    params.push(filters.createdBy)
    clauses.push(`m.created_by = $${params.length}`)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const result = await pool.query<{
    created_at: Date
    item_code: string | null
    item_name: string
    inventory_kind: string
    movement_type: MovementType
    quantity_change: string
    unit_price_without_vat: string | null
    vat_rate: string | null
    unit_price_with_vat: string | null
    note: string | null
    created_by_name: string | null
  }>(
    `SELECT m.created_at, i.item_code, i.name AS item_name, i.inventory_kind,
            m.movement_type, m.quantity_change,
            m.unit_price_without_vat, m.vat_rate, m.unit_price_with_vat, m.note,
            u.name AS created_by_name
     FROM inventory_movements m
     JOIN inventory_items i ON i.id = m.item_id
     LEFT JOIN admin_users u ON u.id = m.created_by
     ${where}
     ORDER BY m.created_at DESC`,
    params,
  )

  return result.rows.map((r) => ({
    happenedAt: r.created_at.toISOString(),
    itemCode: r.item_code ?? '',
    itemName: r.item_name,
    inventoryKind: r.inventory_kind,
    movementType: r.movement_type,
    quantityChange: num(r.quantity_change) ?? 0,
    unitPriceWithoutVat: num(r.unit_price_without_vat),
    vatRate: num(r.vat_rate),
    unitPriceWithVat: num(r.unit_price_with_vat),
    note: r.note ?? '',
    createdByName: r.created_by_name ?? '',
  }))
}

// ---------------------------------------------------------------------------
// Users report
// ---------------------------------------------------------------------------

export interface UserReportRow {
  name: string
  email: string
  role: string
  active: boolean
  createdAt: string
  lastLoginAt: string | null
}

export async function getUserReport(): Promise<UserReportRow[]> {
  const result = await pool.query<{
    name: string
    email: string
    role: string
    is_active: boolean
    created_at: Date
    last_login_at: Date | null
  }>(
    `SELECT name, email, role, is_active, created_at, last_login_at
     FROM admin_users
     ORDER BY
       CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'manager' THEN 2
                 WHEN 'content_editor' THEN 3 ELSE 4 END,
       created_at ASC`,
  )
  return result.rows.map((r) => ({
    name: r.name,
    email: r.email,
    role: r.role,
    active: r.is_active,
    createdAt: r.created_at.toISOString(),
    lastLoginAt: r.last_login_at ? r.last_login_at.toISOString() : null,
  }))
}

// ---------------------------------------------------------------------------
// Filter option helpers (validation against known enums)
// ---------------------------------------------------------------------------

export function isPointCategory(v: string | null | undefined): v is PointCategory {
  return !!v && (POINT_CATEGORIES as string[]).includes(v)
}
export function isPointSource(v: string | null | undefined): v is PointSource {
  return !!v && (POINT_SOURCES as string[]).includes(v)
}
export function isMovementType(v: string | null | undefined): v is MovementType {
  return !!v && (MOVEMENT_TYPES as string[]).includes(v)
}
export function isInventoryKind(v: string | null | undefined): boolean {
  return !!v && (INVENTORY_KINDS as string[]).includes(v)
}
