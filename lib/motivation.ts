import { pool } from './db'

// ---------------------------------------------------------------------------
// Constants & types
// ---------------------------------------------------------------------------

export type PointCategory =
  | 'sales'
  | 'customer_smile'
  | 'team_help'
  | 'reliability'
  | 'cleanliness_preparation'
  | 'event_energy'
  | 'bonus'
  | 'correction'

export const POINT_CATEGORIES: PointCategory[] = [
  'sales',
  'customer_smile',
  'team_help',
  'reliability',
  'cleanliness_preparation',
  'event_energy',
  'bonus',
  'correction',
]

export const CATEGORY_LABELS: Record<PointCategory, string> = {
  sales: 'Predaj',
  customer_smile: 'Zákaznícky úsmev',
  team_help: 'Tímová pomoc',
  reliability: 'Spoľahlivosť',
  cleanliness_preparation: 'Čistota & príprava',
  event_energy: 'Event energia',
  bonus: 'Bonus',
  correction: 'Korekcia',
}

export type PointSource = 'manual' | 'pos' | 'adjustment' | 'team_bonus' | 'correction'

export const POINT_SOURCES: PointSource[] = ['manual', 'pos', 'adjustment', 'team_bonus', 'correction']

export type PointEventStatus = 'active' | 'reversed' | 'cancelled'

/** Score groups used in the bonus formula. */
export type PointGroup = 'sales' | 'experience' | 'team' | 'other'

/** Maps a point category to its bonus-formula group. */
export function categoryGroup(category: PointCategory): PointGroup {
  switch (category) {
    case 'sales':
      return 'sales'
    case 'customer_smile':
    case 'reliability':
    case 'cleanliness_preparation':
    case 'event_energy':
      return 'experience'
    case 'team_help':
      return 'team'
    case 'bonus':
    case 'correction':
    default:
      return 'other'
  }
}

/** Categories that always require a note (experience/team/correction/negative). */
export function categoryRequiresNote(category: PointCategory): boolean {
  return (
    category === 'customer_smile' ||
    category === 'team_help' ||
    category === 'event_energy' ||
    category === 'correction'
  )
}

const round2 = (n: number) => Math.round(n * 100) / 100

function num(v: string | null): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// ---------------------------------------------------------------------------
// Point rules
// ---------------------------------------------------------------------------

export interface PointRule {
  id: string
  name: string
  category: PointCategory
  productName: string | null
  pointsPerUnit: number
  bonusPoints: number | null
  isActive: boolean
  notes: string | null
  validFrom: string | null
  validTo: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

interface RuleRow {
  id: string
  name: string
  category: PointCategory
  product_name: string | null
  points_per_unit: string
  bonus_points: string | null
  is_active: boolean
  notes: string | null
  valid_from: string | null
  valid_to: string | null
  created_by: string | null
  created_at: Date
  updated_at: Date
}

function mapRule(row: RuleRow): PointRule {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    productName: row.product_name,
    pointsPerUnit: num(row.points_per_unit) ?? 0,
    bonusPoints: num(row.bonus_points),
    isActive: row.is_active,
    notes: row.notes,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

const SELECT_RULE = `
  SELECT id, name, category, product_name, points_per_unit, bonus_points,
         is_active, notes, to_char(valid_from,'YYYY-MM-DD') AS valid_from,
         to_char(valid_to,'YYYY-MM-DD') AS valid_to, created_by, created_at, updated_at
  FROM motivation_point_rules
`

export async function listRules(opts: { includeInactive?: boolean } = {}): Promise<PointRule[]> {
  const where = opts.includeInactive ? '' : 'WHERE is_active = true'
  const result = await pool.query<RuleRow>(`${SELECT_RULE} ${where} ORDER BY category ASC, name ASC`)
  return result.rows.map(mapRule)
}

export async function getRule(id: string): Promise<PointRule | null> {
  const result = await pool.query<RuleRow>(`${SELECT_RULE} WHERE id = $1 LIMIT 1`, [id])
  const row = result.rows[0]
  return row ? mapRule(row) : null
}

export interface RuleInput {
  name: string
  category: PointCategory
  productName: string | null
  pointsPerUnit: number
  bonusPoints: number | null
  isActive: boolean
  notes: string | null
  validFrom: string | null
  validTo: string | null
}

export async function createRule(input: RuleInput, createdBy: string): Promise<PointRule> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO motivation_point_rules
       (name, category, product_name, points_per_unit, bonus_points, is_active, notes, valid_from, valid_to, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [
      input.name.trim(),
      input.category,
      input.productName?.trim() || null,
      input.pointsPerUnit,
      input.bonusPoints,
      input.isActive,
      input.notes?.trim() || null,
      input.validFrom,
      input.validTo,
      createdBy,
    ],
  )
  return (await getRule(result.rows[0].id)) as PointRule
}

export async function updateRule(id: string, patch: Partial<RuleInput>): Promise<PointRule | null> {
  const result = await pool.query<{ id: string }>(
    `UPDATE motivation_point_rules SET
       name = COALESCE($2, name),
       category = COALESCE($3, category),
       product_name = $4,
       points_per_unit = COALESCE($5, points_per_unit),
       bonus_points = $6,
       is_active = COALESCE($7, is_active),
       notes = $8,
       valid_from = $9,
       valid_to = $10,
       updated_at = now()
     WHERE id = $1 RETURNING id`,
    [
      id,
      patch.name?.trim() ?? null,
      patch.category ?? null,
      patch.productName?.trim() || null,
      patch.pointsPerUnit ?? null,
      patch.bonusPoints ?? null,
      patch.isActive ?? null,
      patch.notes?.trim() || null,
      patch.validFrom ?? null,
      patch.validTo ?? null,
    ],
  )
  if (result.rowCount === 0) return null
  return getRule(id)
}

/** Soft delete: deactivate a rule (history of events that referenced it is preserved). */
export async function deactivateRule(id: string): Promise<void> {
  await pool.query('UPDATE motivation_point_rules SET is_active = false, updated_at = now() WHERE id = $1', [id])
}

// ---------------------------------------------------------------------------
// Point events
// ---------------------------------------------------------------------------

export interface PointEvent {
  id: string
  staffUserId: string
  staffName: string | null
  category: PointCategory
  source: PointSource
  ruleId: string | null
  ruleName: string | null
  productName: string | null
  quantity: number
  pointsPerUnit: number
  totalPoints: number
  note: string | null
  happenedAt: string
  status: PointEventStatus
  createdBy: string | null
  createdByName: string | null
  createdAt: string
}

interface EventRow {
  id: string
  staff_user_id: string
  staff_name: string | null
  category: PointCategory
  source: PointSource
  rule_id: string | null
  rule_name: string | null
  product_name: string | null
  quantity: string
  points_per_unit: string
  total_points: string
  note: string | null
  happened_at: Date
  status: PointEventStatus
  created_by: string | null
  created_by_name: string | null
  created_at: Date
}

function mapEvent(row: EventRow): PointEvent {
  return {
    id: row.id,
    staffUserId: row.staff_user_id,
    staffName: row.staff_name,
    category: row.category,
    source: row.source,
    ruleId: row.rule_id,
    ruleName: row.rule_name,
    productName: row.product_name,
    quantity: num(row.quantity) ?? 0,
    pointsPerUnit: num(row.points_per_unit) ?? 0,
    totalPoints: num(row.total_points) ?? 0,
    note: row.note,
    happenedAt: row.happened_at.toISOString(),
    status: row.status,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at.toISOString(),
  }
}

const SELECT_EVENT = `
  SELECT e.id, e.staff_user_id, su.name AS staff_name, e.category, e.source,
         e.rule_id, r.name AS rule_name, e.product_name, e.quantity,
         e.points_per_unit, e.total_points, e.note, e.happened_at, e.status,
         e.created_by, cu.name AS created_by_name, e.created_at
  FROM motivation_point_events e
  LEFT JOIN admin_users su ON su.id = e.staff_user_id
  LEFT JOIN admin_users cu ON cu.id = e.created_by
  LEFT JOIN motivation_point_rules r ON r.id = e.rule_id
`

export interface EventFilters {
  staffUserId?: string
  category?: PointCategory
  status?: PointEventStatus
  from?: string
  to?: string
  limit?: number
}

export async function listEvents(filters: EventFilters = {}): Promise<PointEvent[]> {
  const clauses: string[] = []
  const params: unknown[] = []
  if (filters.staffUserId) {
    params.push(filters.staffUserId)
    clauses.push(`e.staff_user_id = $${params.length}`)
  }
  if (filters.category) {
    params.push(filters.category)
    clauses.push(`e.category = $${params.length}`)
  }
  if (filters.status) {
    params.push(filters.status)
    clauses.push(`e.status = $${params.length}`)
  }
  if (filters.from) {
    params.push(filters.from)
    clauses.push(`e.happened_at >= $${params.length}`)
  }
  if (filters.to) {
    params.push(filters.to)
    clauses.push(`e.happened_at <= $${params.length}`)
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500)
  const result = await pool.query<EventRow>(
    `${SELECT_EVENT} ${where} ORDER BY e.happened_at DESC LIMIT ${limit}`,
    params,
  )
  return result.rows.map(mapEvent)
}

export async function getEvent(id: string): Promise<PointEvent | null> {
  const result = await pool.query<EventRow>(`${SELECT_EVENT} WHERE e.id = $1 LIMIT 1`, [id])
  const row = result.rows[0]
  return row ? mapEvent(row) : null
}

export interface EventInput {
  staffUserId: string
  category: PointCategory
  source: PointSource
  ruleId: string | null
  productName: string | null
  quantity: number
  pointsPerUnit: number
  note: string | null
  happenedAt: string | null
}

/**
 * Records a manual point event. total_points = round2(quantity * pointsPerUnit).
 * Negative totals are allowed (corrections) and gated at the API layer by capability.
 */
export async function createEvent(input: EventInput, createdBy: string): Promise<PointEvent> {
  const totalPoints = round2(input.quantity * input.pointsPerUnit)
  const result = await pool.query<{ id: string }>(
    `INSERT INTO motivation_point_events
       (staff_user_id, category, source, rule_id, product_name, quantity,
        points_per_unit, total_points, note, happened_at, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, COALESCE($10, now()), $11)
     RETURNING id`,
    [
      input.staffUserId,
      input.category,
      input.source,
      input.ruleId,
      input.productName?.trim() || null,
      input.quantity,
      input.pointsPerUnit,
      totalPoints,
      input.note?.trim() || null,
      input.happenedAt,
      createdBy,
    ],
  )
  return (await getEvent(result.rows[0].id)) as PointEvent
}

/** Reverses (or cancels) a point event without destroying history. Appends a note. */
export async function setEventStatus(
  id: string,
  status: Exclude<PointEventStatus, 'active'>,
  note: string,
): Promise<PointEvent | null> {
  const result = await pool.query<{ id: string }>(
    `UPDATE motivation_point_events
     SET status = $2,
         note = CASE WHEN note IS NULL OR note = '' THEN $3 ELSE note || ' | ' || $3 END
     WHERE id = $1 AND status = 'active' RETURNING id`,
    [id, status, note.trim()],
  )
  if (result.rowCount === 0) return null
  return getEvent(id)
}

// ---------------------------------------------------------------------------
// Bonus periods (settings)
// ---------------------------------------------------------------------------

export interface BonusPeriod {
  id: string
  name: string | null
  periodStart: string
  periodEnd: string
  pointValueEur: number
  monthlyPersonalTarget: number | null
  monthlyTeamTarget: number | null
  teamBonusAmount: number | null
  isActive: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface PeriodRow {
  id: string
  name: string | null
  period_start: string
  period_end: string
  point_value_eur: string
  monthly_personal_target: string | null
  monthly_team_target: string | null
  team_bonus_amount: string | null
  is_active: boolean
  notes: string | null
  created_at: Date
  updated_at: Date
}

function mapPeriod(row: PeriodRow): BonusPeriod {
  return {
    id: row.id,
    name: row.name,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    pointValueEur: num(row.point_value_eur) ?? 0,
    monthlyPersonalTarget: num(row.monthly_personal_target),
    monthlyTeamTarget: num(row.monthly_team_target),
    teamBonusAmount: num(row.team_bonus_amount),
    isActive: row.is_active,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

const SELECT_PERIOD = `
  SELECT id, name, to_char(period_start,'YYYY-MM-DD') AS period_start,
         to_char(period_end,'YYYY-MM-DD') AS period_end, point_value_eur,
         monthly_personal_target, monthly_team_target, team_bonus_amount,
         is_active, notes, created_at, updated_at
  FROM motivation_bonus_periods
`

export async function listPeriods(): Promise<BonusPeriod[]> {
  const result = await pool.query<PeriodRow>(`${SELECT_PERIOD} ORDER BY period_start DESC`)
  return result.rows.map(mapPeriod)
}

export async function getPeriod(id: string): Promise<BonusPeriod | null> {
  const result = await pool.query<PeriodRow>(`${SELECT_PERIOD} WHERE id = $1 LIMIT 1`, [id])
  const row = result.rows[0]
  return row ? mapPeriod(row) : null
}

/** Returns the active period covering today, else the most recent active period, else null. */
export async function getActivePeriod(): Promise<BonusPeriod | null> {
  const covering = await pool.query<PeriodRow>(
    `${SELECT_PERIOD} WHERE is_active = true AND period_start <= now()::date AND period_end >= now()::date
     ORDER BY period_start DESC LIMIT 1`,
  )
  if (covering.rows[0]) return mapPeriod(covering.rows[0])
  const recent = await pool.query<PeriodRow>(
    `${SELECT_PERIOD} WHERE is_active = true ORDER BY period_start DESC LIMIT 1`,
  )
  return recent.rows[0] ? mapPeriod(recent.rows[0]) : null
}

export interface PeriodInput {
  name: string | null
  periodStart: string
  periodEnd: string
  pointValueEur: number
  monthlyPersonalTarget: number | null
  monthlyTeamTarget: number | null
  teamBonusAmount: number | null
  isActive: boolean
  notes: string | null
}

export async function createPeriod(input: PeriodInput, createdBy: string): Promise<BonusPeriod> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO motivation_bonus_periods
       (name, period_start, period_end, point_value_eur, monthly_personal_target,
        monthly_team_target, team_bonus_amount, is_active, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [
      input.name?.trim() || null,
      input.periodStart,
      input.periodEnd,
      input.pointValueEur,
      input.monthlyPersonalTarget,
      input.monthlyTeamTarget,
      input.teamBonusAmount,
      input.isActive,
      input.notes?.trim() || null,
      createdBy,
    ],
  )
  return (await getPeriod(result.rows[0].id)) as BonusPeriod
}

export async function updatePeriod(id: string, patch: Partial<PeriodInput>): Promise<BonusPeriod | null> {
  const result = await pool.query<{ id: string }>(
    `UPDATE motivation_bonus_periods SET
       name = $2,
       period_start = COALESCE($3, period_start),
       period_end = COALESCE($4, period_end),
       point_value_eur = COALESCE($5, point_value_eur),
       monthly_personal_target = $6,
       monthly_team_target = $7,
       team_bonus_amount = $8,
       is_active = COALESCE($9, is_active),
       notes = $10,
       updated_at = now()
     WHERE id = $1 RETURNING id`,
    [
      id,
      patch.name?.trim() || null,
      patch.periodStart ?? null,
      patch.periodEnd ?? null,
      patch.pointValueEur ?? null,
      patch.monthlyPersonalTarget ?? null,
      patch.monthlyTeamTarget ?? null,
      patch.teamBonusAmount ?? null,
      patch.isActive ?? null,
      patch.notes?.trim() || null,
    ],
  )
  if (result.rowCount === 0) return null
  return getPeriod(id)
}

// ---------------------------------------------------------------------------
// Quality multipliers
// ---------------------------------------------------------------------------

export interface StaffMultiplier {
  id: string
  staffUserId: string
  staffName: string | null
  periodStart: string
  periodEnd: string
  multiplier: number
  note: string | null
  createdAt: string
  updatedAt: string
}

interface MultiplierRow {
  id: string
  staff_user_id: string
  staff_name: string | null
  period_start: string
  period_end: string
  multiplier: string
  note: string | null
  created_at: Date
  updated_at: Date
}

function mapMultiplier(row: MultiplierRow): StaffMultiplier {
  return {
    id: row.id,
    staffUserId: row.staff_user_id,
    staffName: row.staff_name,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    multiplier: num(row.multiplier) ?? 1,
    note: row.note,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

const SELECT_MULT = `
  SELECT m.id, m.staff_user_id, u.name AS staff_name,
         to_char(m.period_start,'YYYY-MM-DD') AS period_start,
         to_char(m.period_end,'YYYY-MM-DD') AS period_end,
         m.multiplier, m.note, m.created_at, m.updated_at
  FROM motivation_staff_multipliers m
  LEFT JOIN admin_users u ON u.id = m.staff_user_id
`

export async function listMultipliers(periodStart: string, periodEnd: string): Promise<StaffMultiplier[]> {
  const result = await pool.query<MultiplierRow>(
    `${SELECT_MULT} WHERE m.period_start = $1 AND m.period_end = $2 ORDER BY u.name ASC`,
    [periodStart, periodEnd],
  )
  return result.rows.map(mapMultiplier)
}

/** Inserts or updates the multiplier for a staff member in a period. */
export async function upsertMultiplier(
  args: { staffUserId: string; periodStart: string; periodEnd: string; multiplier: number; note: string | null },
  createdBy: string,
): Promise<StaffMultiplier> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO motivation_staff_multipliers (staff_user_id, period_start, period_end, multiplier, note, created_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (staff_user_id, period_start, period_end)
     DO UPDATE SET multiplier = EXCLUDED.multiplier, note = EXCLUDED.note, updated_at = now()
     RETURNING id`,
    [args.staffUserId, args.periodStart, args.periodEnd, args.multiplier, args.note?.trim() || null, createdBy],
  )
  const row = await pool.query<MultiplierRow>(`${SELECT_MULT} WHERE m.id = $1`, [result.rows[0].id])
  return mapMultiplier(row.rows[0])
}

// ---------------------------------------------------------------------------
// Aggregations / scoring
// ---------------------------------------------------------------------------

export interface PointBreakdown {
  sales: number
  experience: number
  team: number
  other: number
  total: number
}

const EXPERIENCE_CATS = "('customer_smile','reliability','cleanliness_preparation','event_energy')"

/** Aggregates active points per staff between [from, to) timestamps (ISO strings). */
async function aggregateByStaff(from: string, to: string): Promise<Map<string, PointBreakdown>> {
  const result = await pool.query<{
    staff_user_id: string
    sales: string | null
    experience: string | null
    team: string | null
    other: string | null
    total: string | null
  }>(
    `SELECT staff_user_id,
        SUM(total_points) FILTER (WHERE category = 'sales') AS sales,
        SUM(total_points) FILTER (WHERE category IN ${EXPERIENCE_CATS}) AS experience,
        SUM(total_points) FILTER (WHERE category = 'team_help') AS team,
        SUM(total_points) FILTER (WHERE category IN ('bonus','correction')) AS other,
        SUM(total_points) AS total
     FROM motivation_point_events
     WHERE status = 'active' AND happened_at >= $1 AND happened_at < $2
     GROUP BY staff_user_id`,
    [from, to],
  )
  const map = new Map<string, PointBreakdown>()
  for (const r of result.rows) {
    map.set(r.staff_user_id, {
      sales: round2(num(r.sales) ?? 0),
      experience: round2(num(r.experience) ?? 0),
      team: round2(num(r.team) ?? 0),
      other: round2(num(r.other) ?? 0),
      total: round2(num(r.total) ?? 0),
    })
  }
  return map
}

/**
 * Approximate worked hours per staff for work-like shifts overlapping [from, to] (dates).
 * All-day work shifts count as 8h/day; timed shifts use their duration per spanned day.
 */
async function workedHoursByStaff(fromDate: string, toDate: string): Promise<Map<string, number>> {
  const result = await pool.query<{ staff_user_id: string; hours: string | null }>(
    `SELECT staff_user_id,
        SUM(
          CASE WHEN all_day THEN 8 * (end_date - start_date + 1)
               WHEN start_time IS NOT NULL AND end_time IS NOT NULL
                 THEN (EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0) * (end_date - start_date + 1)
               ELSE 0 END
        ) AS hours
     FROM work_shifts
     WHERE entry_type IN ('work_shift','training')
       AND status <> 'cancelled'
       AND start_date <= $2 AND end_date >= $1
     GROUP BY staff_user_id`,
    [fromDate, toDate],
  )
  const map = new Map<string, number>()
  for (const r of result.rows) map.set(r.staff_user_id, round2(num(r.hours) ?? 0))
  return map
}

export interface LeaderboardEntry {
  staffUserId: string
  staffName: string
  staffEmail: string
  role: string
  breakdown: PointBreakdown
  multiplier: number
  finalPoints: number
  estimatedBonus: number
  workedHours: number
  pointsPerHour: number | null
}

export interface MotivationOverview {
  period: BonusPeriod | null
  teamToday: number
  teamWeek: number
  teamMonth: number
  teamPeriodPoints: number
  teamTarget: number | null
  teamTargetProgress: number | null
  teamBonusAmount: number | null
  estimatedTeamBonusTotal: number
  leaderboard: LeaderboardEntry[]
}

/** Active users eligible to appear in the motivation system. */
async function listActiveStaff(): Promise<{ id: string; name: string; email: string; role: string }[]> {
  const result = await pool.query<{ id: string; name: string; email: string; role: string }>(
    `SELECT id, name, email, role FROM admin_users WHERE is_active = true ORDER BY name ASC`,
  )
  return result.rows
}

function rangeStartIso(kind: 'today' | 'week' | 'month'): string {
  const now = new Date()
  if (kind === 'today') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
  }
  if (kind === 'month') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  }
  // week: Monday 00:00 UTC
  const day = now.getUTCDay() // 0=Sun..6=Sat
  const diff = (day + 6) % 7 // days since Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff))
  return monday.toISOString()
}

async function teamSum(fromIso: string, toIso: string): Promise<number> {
  const result = await pool.query<{ total: string | null }>(
    `SELECT SUM(total_points) AS total FROM motivation_point_events
     WHERE status = 'active' AND happened_at >= $1 AND happened_at < $2`,
    [fromIso, toIso],
  )
  return round2(num(result.rows[0]?.total ?? null) ?? 0)
}

/** Builds the full team overview: time totals, leaderboard, target progress, bonus estimates. */
export async function getOverview(): Promise<MotivationOverview> {
  const period = await getActivePeriod()
  const nowIso = new Date(Date.now() + 1000).toISOString()

  const [teamToday, teamWeek, teamMonth] = await Promise.all([
    teamSum(rangeStartIso('today'), nowIso),
    teamSum(rangeStartIso('week'), nowIso),
    teamSum(rangeStartIso('month'), nowIso),
  ])

  // Period window for leaderboard + bonus. Falls back to current month when no period.
  const periodStartDate = period?.periodStart ?? rangeStartIso('month').slice(0, 10)
  const periodEndDate = period?.periodEnd ?? nowIso.slice(0, 10)
  const fromIso = `${periodStartDate}T00:00:00.000Z`
  const toIso = `${periodEndDate}T23:59:59.999Z`

  const [staff, agg, hours, multipliers] = await Promise.all([
    listActiveStaff(),
    aggregateByStaff(fromIso, toIso),
    workedHoursByStaff(periodStartDate, periodEndDate),
    period ? listMultipliers(period.periodStart, period.periodEnd) : Promise.resolve([] as StaffMultiplier[]),
  ])
  const multMap = new Map(multipliers.map((m) => [m.staffUserId, m.multiplier]))
  const pointValue = period?.pointValueEur ?? 0

  const leaderboard: LeaderboardEntry[] = staff
    .map((s) => {
      const breakdown = agg.get(s.id) ?? { sales: 0, experience: 0, team: 0, other: 0, total: 0 }
      const multiplier = multMap.get(s.id) ?? 1
      const finalPoints = round2(breakdown.total * multiplier)
      const workedHours = hours.get(s.id) ?? 0
      return {
        staffUserId: s.id,
        staffName: s.name,
        staffEmail: s.email,
        role: s.role,
        breakdown,
        multiplier,
        finalPoints,
        estimatedBonus: round2(finalPoints * pointValue),
        workedHours,
        pointsPerHour: workedHours > 0 ? round2(breakdown.total / workedHours) : null,
      }
    })
    // Keep entries with any points or worked hours; drop empty admins to reduce noise.
    .filter((e) => e.breakdown.total !== 0 || e.workedHours > 0)
    .sort((a, b) => b.finalPoints - a.finalPoints)

  const teamPeriodPoints = round2(leaderboard.reduce((sum, e) => sum + e.breakdown.total, 0))
  const estimatedTeamBonusTotal = round2(leaderboard.reduce((sum, e) => sum + e.estimatedBonus, 0))
  const teamTarget = period?.monthlyTeamTarget ?? null
  const teamTargetProgress =
    teamTarget && teamTarget > 0 ? round2((teamPeriodPoints / teamTarget) * 100) : null

  return {
    period,
    teamToday,
    teamWeek,
    teamMonth,
    teamPeriodPoints,
    teamTarget,
    teamTargetProgress,
    teamBonusAmount: period?.teamBonusAmount ?? null,
    estimatedTeamBonusTotal,
    leaderboard,
  }
}

export interface MyPoints {
  period: BonusPeriod | null
  today: number
  week: number
  month: number
  breakdown: PointBreakdown
  multiplier: number
  finalPoints: number
  estimatedBonus: number
  personalTarget: number | null
  personalTargetProgress: number | null
  workedHours: number
  pointsPerHour: number | null
  history: PointEvent[]
  positiveNotes: PointEvent[]
}

/** Builds the staff-facing view for a single user. */
export async function getMyPoints(staffUserId: string): Promise<MyPoints> {
  const period = await getActivePeriod()
  const nowIso = new Date(Date.now() + 1000).toISOString()

  const periodStartDate = period?.periodStart ?? rangeStartIso('month').slice(0, 10)
  const periodEndDate = period?.periodEnd ?? nowIso.slice(0, 10)
  const fromIso = `${periodStartDate}T00:00:00.000Z`
  const toIso = `${periodEndDate}T23:59:59.999Z`

  const [todaySum, weekSum, monthSum, agg, hours, multipliers, history] = await Promise.all([
    teamSumForStaff(staffUserId, rangeStartIso('today'), nowIso),
    teamSumForStaff(staffUserId, rangeStartIso('week'), nowIso),
    teamSumForStaff(staffUserId, rangeStartIso('month'), nowIso),
    aggregateByStaff(fromIso, toIso),
    workedHoursByStaff(periodStartDate, periodEndDate),
    period ? listMultipliers(period.periodStart, period.periodEnd) : Promise.resolve([] as StaffMultiplier[]),
    listEvents({ staffUserId, limit: 50 }),
  ])

  const breakdown = agg.get(staffUserId) ?? { sales: 0, experience: 0, team: 0, other: 0, total: 0 }
  const multiplier = multipliers.find((m) => m.staffUserId === staffUserId)?.multiplier ?? 1
  const finalPoints = round2(breakdown.total * multiplier)
  const pointValue = period?.pointValueEur ?? 0
  const workedHours = hours.get(staffUserId) ?? 0
  const personalTarget = period?.monthlyPersonalTarget ?? null

  return {
    period,
    today: todaySum,
    week: weekSum,
    month: monthSum,
    breakdown,
    multiplier,
    finalPoints,
    estimatedBonus: round2(finalPoints * pointValue),
    personalTarget,
    personalTargetProgress:
      personalTarget && personalTarget > 0 ? round2((breakdown.total / personalTarget) * 100) : null,
    workedHours,
    pointsPerHour: workedHours > 0 ? round2(breakdown.total / workedHours) : null,
    history,
    positiveNotes: history
      .filter(
        (e) =>
          e.status === 'active' &&
          e.note &&
          (categoryGroup(e.category) === 'experience' || categoryGroup(e.category) === 'team'),
      )
      .slice(0, 10),
  }
}

async function teamSumForStaff(staffUserId: string, fromIso: string, toIso: string): Promise<number> {
  const result = await pool.query<{ total: string | null }>(
    `SELECT SUM(total_points) AS total FROM motivation_point_events
     WHERE status = 'active' AND staff_user_id = $1 AND happened_at >= $2 AND happened_at < $3`,
    [staffUserId, fromIso, toIso],
  )
  return round2(num(result.rows[0]?.total ?? null) ?? 0)
}

/** Active users that points can be assigned to (for select dropdowns). */
export async function listAssignableStaff(): Promise<
  { id: string; name: string; email: string; role: string }[]
> {
  return listActiveStaff()
}
