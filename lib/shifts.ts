import { pool } from './db'

export type ShiftStatus = 'draft' | 'published' | 'cancelled'

export interface WorkShift {
  id: string
  staffUserId: string
  staffName: string
  staffEmail: string
  shiftDate: string // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string // HH:MM
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
  shift_date: string
  start_time: string
  end_time: string
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
    // shift_date comes back as a 'YYYY-MM-DD' string because of the date type cast below
    shiftDate: row.shift_date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
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
         to_char(s.shift_date, 'YYYY-MM-DD') AS shift_date,
         s.start_time, s.end_time, s.location, s.position, s.notes,
         s.status, s.created_by, s.created_at, s.updated_at
  FROM work_shifts s
  JOIN admin_users u ON u.id = s.staff_user_id
`

export interface ShiftFilters {
  from?: string // inclusive YYYY-MM-DD
  to?: string // inclusive YYYY-MM-DD
  staffUserId?: string
  status?: ShiftStatus
  /** When set, restricts results to this single staff member (used for read_own scope). */
  onlyStaffUserId?: string
  /** When true, exclude draft shifts (staff should only see published/cancelled). */
  publishedOnly?: boolean
}

export async function listShifts(filters: ShiftFilters): Promise<WorkShift[]> {
  const clauses: string[] = []
  const params: unknown[] = []

  if (filters.from) {
    params.push(filters.from)
    clauses.push(`s.shift_date >= $${params.length}`)
  }
  if (filters.to) {
    params.push(filters.to)
    clauses.push(`s.shift_date <= $${params.length}`)
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
  if (filters.publishedOnly) {
    clauses.push(`s.status <> 'draft'`)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const result = await pool.query<ShiftRow>(
    `${SELECT_SHIFT} ${where} ORDER BY s.shift_date ASC, s.start_time ASC, u.name ASC`,
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
  shiftDate: string
  startTime: string
  endTime: string
  location: string
  position: string
  notes: string
  status: ShiftStatus
}

export async function createShift(input: ShiftInput, createdBy: string): Promise<WorkShift> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO work_shifts
       (staff_user_id, shift_date, start_time, end_time, location, position, notes, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      input.staffUserId,
      input.shiftDate,
      input.startTime,
      input.endTime,
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

export async function updateShift(
  id: string,
  patch: Partial<ShiftInput>,
): Promise<WorkShift | null> {
  const result = await pool.query<{ id: string }>(
    `UPDATE work_shifts SET
       staff_user_id = COALESCE($2, staff_user_id),
       shift_date = COALESCE($3, shift_date),
       start_time = COALESCE($4, start_time),
       end_time = COALESCE($5, end_time),
       location = COALESCE($6, location),
       position = COALESCE($7, position),
       notes = COALESCE($8, notes),
       status = COALESCE($9, status),
       updated_at = now()
     WHERE id = $1
     RETURNING id`,
    [
      id,
      patch.staffUserId ?? null,
      patch.shiftDate ?? null,
      patch.startTime ?? null,
      patch.endTime ?? null,
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
