import { pool } from './db'
import { hashPassword, type AdminUser } from './auth'
import type { AdminRole } from './permissions'

interface AdminUserRow {
  id: string
  email: string
  name: string
  role: AdminRole
  is_active: boolean
  created_at: Date
  updated_at: Date
  last_login_at: Date | null
}

function mapUser(row: AdminUserRow): AdminUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
  }
}

export async function listUsers(): Promise<AdminUser[]> {
  const result = await pool.query<AdminUserRow>(
    `SELECT * FROM admin_users ORDER BY
       CASE role
         WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'manager' THEN 2
         WHEN 'content_editor' THEN 3 ELSE 4 END,
       created_at ASC`,
  )
  return result.rows.map(mapUser)
}

export async function getUser(id: string): Promise<AdminUser | null> {
  const result = await pool.query<AdminUserRow>('SELECT * FROM admin_users WHERE id = $1 LIMIT 1', [id])
  const row = result.rows[0]
  return row ? mapUser(row) : null
}

export async function emailExists(email: string, excludeId?: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT id FROM admin_users WHERE lower(email) = lower($1) AND ($2::uuid IS NULL OR id <> $2) LIMIT 1',
    [email, excludeId ?? null],
  )
  return (result.rowCount ?? 0) > 0
}

export async function createUser(input: {
  email: string
  name: string
  password: string
  role: AdminRole
}): Promise<AdminUser> {
  const passwordHash = await hashPassword(input.password)
  const result = await pool.query<AdminUserRow>(
    `INSERT INTO admin_users (email, name, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING *`,
    [input.email.trim(), input.name.trim(), passwordHash, input.role],
  )
  return mapUser(result.rows[0])
}

export async function updateUser(
  id: string,
  patch: { name?: string; role?: AdminRole; isActive?: boolean },
): Promise<AdminUser | null> {
  const result = await pool.query<AdminUserRow>(
    `UPDATE admin_users SET
       name = COALESCE($2, name),
       role = COALESCE($3, role),
       is_active = COALESCE($4, is_active),
       updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, patch.name ?? null, patch.role ?? null, patch.isActive ?? null],
  )
  const row = result.rows[0]
  return row ? mapUser(row) : null
}

export async function setUserPassword(id: string, password: string): Promise<void> {
  const passwordHash = await hashPassword(password)
  await pool.query('UPDATE admin_users SET password_hash = $2, updated_at = now() WHERE id = $1', [
    id,
    passwordHash,
  ])
  // Invalidate all existing sessions on password reset.
  await pool.query('DELETE FROM admin_sessions WHERE user_id = $1', [id])
}

export async function deleteUser(id: string): Promise<void> {
  await pool.query('DELETE FROM admin_users WHERE id = $1', [id])
}

export async function countOwners(): Promise<number> {
  const result = await pool.query("SELECT COUNT(*)::int AS c FROM admin_users WHERE role = 'owner' AND is_active = true")
  return result.rows[0]?.c ?? 0
}
