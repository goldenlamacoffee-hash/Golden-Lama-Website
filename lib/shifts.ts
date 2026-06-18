import { pool } from './db'

export type ShiftStatus = 'draft' | 'published' | 'cancelled'

export type EntryType = 'work_shift' | 'vacation' | 'sick_leave' | 'unavailable' | 'training' | 'other'

export const ENTRY_TYPES: EntryType[] = [
  'work_shift',
  'vacation',
  'sick_leave',
  'unavailable',
  'training',
  'other',
]

/** Entry types that represent an actual on-site work shift (times are meaningful). */
export function isWorkLike(type: EntryType): boolean {
  return type === 'work_shift' || type === 'training'
}

/** Entry types shown on the dedicated work-shift planner (/admin/shifts). */
export const WORK_SHIFT_TYPES: EntryType[] = ['work_shift']

/** Entry types shown on the absence/unavailability calendar (/admin/calendar). */
export const ABSENCE_TYPES: EntryType[] = ['vacation', 'sick_leave', 'unavailable', 'training', 'other']

export type CalendarMode = 'shift' | 'absence'

/** Resolves the allowed entry types for a given page mode. */
export function entryTypesForMode(mode: CalendarMode): EntryType[] {
  return mode === 'shift' ? WORK_SHIFT_TYPES : ABSENCE_TYPES
}

export interface WorkShift {
  id: string
  staffUserId: string
  staffName: string
  staffEmail: string
  entryType: EntryType
  allDay: boolean
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD (inclusive)
  startTime: string | null // HH:MM, null when allDay
  endTime: string | null // HH:MM, null when allDay
  location: string
  position: string
  notes: string
  status: ShiftStatus
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

interface ShiftRow {
  id: string
  staff_user_id: string
  staff_name: string
  staff_email: string
  entry_type: EntryType
  all_day: boolean
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  location: string
  position: string
  notes: string
  status: ShiftStatus
  created_by: string | null
  created_at: Date
  updated_at: Date
}

function mapShift(row: ShiftRow): WorkShift {
  return {
    id: row.id,
    staffUserId: row.staff_user_id,
    staffName: row.staff_name,
    staffEmail: row.staff_email,
    entryType: row.entry_type,
    allDay: row.all_day,
    // dates come back as 'YYYY-MM-DD' strings because of the to_char casts below
    startDate: row.start_date,
    endDate: row.end_date,
    startTime: row.start_time ? row.start_time.slice(0, 5) : null,
    endTime: row.end_time ? row.end_time.slice(0, 5) : null,
    location: row.location,
    position: row.position,
    notes: row.notes,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

const SELECT_SHIFT = `
  SELECT s.id, s.staff_user_id,
         u.name AS staff_name, u.email AS staff_email,
         s.entry_type, s.all_day,
         to_char(s.start_date, 'YYYY-MM-DD') AS start_date,
         to_char(s.end_date, 'YYYY-MM-DD') AS end_date,
         s.start_time, s.end_time, s.location, s.position, s.notes,
         s.status, s.created_by, s.created_at, s.updated_at
  FROM work_shifts s
  JOIN admin_users u ON u.id = s.staff_user_id
`

export interface ShiftFilters {
  from?: string // inclusive YYYY-MM-DD (window start)
  to?: string // inclusive YYYY-MM-DD (window end)
  staffUserId?: string
  status?: ShiftStatus
  entryType?: EntryType
  /** Restricts results to this set of entry types (used to separate shifts vs. absences). */
  entryTypes?: EntryType[]
  /** When set, restricts results to this single staff member (used for read_own scope). */
  onlyStaffUserId?: string
  /** When true, exclude draft shifts (staff should only see published/cancelled). */
  publishedOnly?: boolean
}

export async function listShifts(filters: ShiftFilters): Promise<WorkShift[]> {
  const clauses: string[] = []
  const params: unknown[] = []

  // Range overlap: an entry [start_date, end_date] overlaps the window [from, to]
  // when start_date <= to AND end_date >= from.
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
  if (filters.onlyStaffUserId) {
    params.push(filters.onlyStaffUserId)
    clauses.push(`s.staff_user_id = $${params.length}`)
  }
  if (filters.status) {
    params.push(filters.status)
    clauses.push(`s.status = $${params.length}`)
  }
  if (filters.entryType) {
    params.push(filters.entryType)
    clauses.push(`s.entry_type = $${params.length}`)
  }
  if (filters.entryTypes && filters.entryTypes.length > 0) {
    params.push(filters.entryTypes)
    clauses.push(`s.entry_type = ANY($${params.length})`)
  }
  if (filters.publishedOnly) {
    clauses.push(`s.status <> 'draft'`)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const result = await pool.query<ShiftRow>(
    `${SELECT_SHIFT} ${where} ORDER BY s.start_date ASC, s.all_day DESC, s.start_time ASC NULLS FIRST, u.name ASC`,
    params,
  )
  return result.rows.map(mapShift)
}

export async function getShift(id: string): Promise<WorkShift | null> {
  const result = await pool.query<ShiftRow>(`${SELECT_SHIFT} WHERE s.id = $1 LIMIT 1`, [id])
  const row = result.rows[0]
  return row ? mapShift(row) : null
}

export interface ShiftInput {
  staffUserId: string
  entryType: EntryType
  allDay: boolean
  startDate: string
  endDate: string
  startTime: string | null
  endTime: string | null
  location: string
  position: string
  notes: string
  status: ShiftStatus
}

export async function createShift(input: ShiftInput, createdBy: string): Promise<WorkShift> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO work_shifts
       (staff_user_id, entry_type, all_day, start_date, end_date, shift_date,
        start_time, end_time, location, position, notes, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $4, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    [
      input.staffUserId,
      input.entryType,
      input.allDay,
      input.startDate,
      input.endDate,
      input.allDay ? null : input.startTime,
      input.allDay ? null : input.endTime,
      input.location.trim(),
      input.position.trim(),
      input.notes.trim(),
      input.status,
      createdBy,
    ],
  )
  const created = await getShift(result.rows[0].id)
  return created as WorkShift
}

export async function updateShift(id: string, patch: Partial<ShiftInput>): Promise<WorkShift | null> {
  // Resolve all_day first so we can null out times when switching to all-day.
  const startTime = patch.allDay === true ? null : patch.startTime
  const endTime = patch.allDay === true ? null : patch.endTime

  const result = await pool.query<{ id: string }>(
    `UPDATE work_shifts SET
       staff_user_id = COALESCE($2, staff_user_id),
       entry_type = COALESCE($3, entry_type),
       all_day = COALESCE($4, all_day),
       start_date = COALESCE($5, start_date),
       end_date = COALESCE($6, end_date),
       shift_date = COALESCE($5, shift_date),
       start_time = CASE WHEN $4 = true THEN NULL ELSE COALESCE($7, start_time) END,
       end_time = CASE WHEN $4 = true THEN NULL ELSE COALESCE($8, end_time) END,
       location = COALESCE($9, location),
       position = COALESCE($10, position),
       notes = COALESCE($11, notes),
       status = COALESCE($12, status),
       updated_at = now()
     WHERE id = $1
     RETURNING id`,
    [
      id,
      patch.staffUserId ?? null,
      patch.entryType ?? null,
      patch.allDay ?? null,
      patch.startDate ?? null,
      patch.endDate ?? null,
      startTime ?? null,
      endTime ?? null,
      patch.location ?? null,
      patch.position ?? null,
      patch.notes ?? null,
      patch.status ?? null,
    ],
  )
  if (result.rowCount === 0) return null
  return getShift(id)
}

export async function deleteShift(id: string): Promise<void> {
  await pool.query('DELETE FROM work_shifts WHERE id = $1', [id])
}

/**
 * Finds existing non-cancelled entries for a staff member whose date range overlaps
 * the given range. Used to warn about double-booking. Optionally excludes a shift id
 * (when editing). Returns lightweight conflict descriptors.
 */
export async function findOverlappingShifts(args: {
  staffUserId: string
  startDate: string
  endDate: string
  excludeId?: string
}): Promise<{ id: string; staffUserId: string; staffName: string; entryType: EntryType; startDate: string; endDate: string; allDay: boolean; startTime: string | null; endTime: string | null; status: ShiftStatus }[]> {
  const params: unknown[] = [args.staffUserId, args.endDate, args.startDate]
  let exclude = ''
  if (args.excludeId) {
    params.push(args.excludeId)
    exclude = `AND s.id <> $${params.length}`
  }
  const result = await pool.query<ShiftRow>(
    `${SELECT_SHIFT}
     WHERE s.staff_user_id = $1
       AND s.status <> 'cancelled'
       AND s.start_date <= $2
       AND s.end_date >= $3
       ${exclude}
     ORDER BY s.start_date ASC`,
    params,
  )
  return result.rows.map((r) => {
    const m = mapShift(r)
    return {
      id: m.id,
      staffUserId: m.staffUserId,
      staffName: m.staffName,
      entryType: m.entryType,
      startDate: m.startDate,
      endDate: m.endDate,
      allDay: m.allDay,
      startTime: m.startTime,
      endTime: m.endTime,
      status: m.status,
    }
  })
}

/** Active (non-deactivated) users that can be assigned to shifts. */
export async function listAssignableStaff(): Promise<
  { id: string; name: string; email: string; role: string }[]
> {
  const result = await pool.query<{ id: string; name: string; email: string; role: string }>(
    `SELECT id, name, email, role FROM admin_users
     WHERE is_active = true
     ORDER BY name ASC, email ASC`,
  )
  return result.rows
}
