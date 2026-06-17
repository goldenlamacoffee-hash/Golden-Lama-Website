import { cookies } from 'next/headers'
import { createHash, randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { pool } from './db'
import type { AdminRole } from './permissions'

export const SESSION_COOKIE = 'admin_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

export interface AdminUser {
  id: string
  email: string
  name: string
  role: AdminRole
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
}

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

// ---------- Password helpers ----------

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ---------- Session token helpers ----------

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// ---------- User queries ----------

export async function getUserByEmail(
  email: string,
): Promise<(AdminUser & { passwordHash: string }) | null> {
  const result = await pool.query<AdminUserRow & { password_hash: string }>(
    'SELECT * FROM admin_users WHERE lower(email) = lower($1) LIMIT 1',
    [email],
  )
  const row = result.rows[0]
  if (!row) return null
  return { ...mapUser(row), passwordHash: row.password_hash }
}

export async function getUserById(id: string): Promise<AdminUser | null> {
  const result = await pool.query<AdminUserRow>('SELECT * FROM admin_users WHERE id = $1 LIMIT 1', [id])
  const row = result.rows[0]
  return row ? mapUser(row) : null
}

// ---------- Session lifecycle ----------

export async function createSession(
  userId: string,
  meta?: { userAgent?: string; ip?: string },
): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await pool.query(
    `INSERT INTO admin_sessions (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, expiresAt, meta?.userAgent ?? null, meta?.ip ?? null],
  )
  return token
}

export async function destroySession(token: string): Promise<void> {
  await pool.query('DELETE FROM admin_sessions WHERE token_hash = $1', [hashToken(token)])
}

export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await pool.query('DELETE FROM admin_sessions WHERE user_id = $1', [userId])
}

/** Returns the active, non-expired user for the current request cookie, or null. */
export async function getCurrentUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const result = await pool.query<AdminUserRow>(
    `SELECT u.* FROM admin_sessions s
     JOIN admin_users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now() AND u.is_active = true
     LIMIT 1`,
    [hashToken(token)],
  )
  const row = result.rows[0]
  return row ? mapUser(row) : null
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  const isProduction = process.env.NODE_ENV === 'production'
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: isProduction ? 'lax' : 'none',
    maxAge: SESSION_TTL_MS / 1000,
    path: '/',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  // also clear the legacy cookie if present
  cookieStore.delete('admin_token')
}

export async function touchLastLogin(userId: string): Promise<void> {
  await pool.query('UPDATE admin_users SET last_login_at = now() WHERE id = $1', [userId])
}

// ---------- Audit log ----------

export async function logAudit(params: {
  actorUserId?: string | null
  actorEmail?: string | null
  action: string
  targetUserId?: string | null
  details?: Record<string, unknown>
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO admin_audit_log (actor_user_id, actor_email, action, target_user_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        params.actorUserId ?? null,
        params.actorEmail ?? null,
        params.action,
        params.targetUserId ?? null,
        params.details ? JSON.stringify(params.details) : null,
      ],
    )
  } catch {
    // never let audit logging break the request
  }
}

// ---------- Owner bootstrap ----------

let bootstrapPromise: Promise<void> | null = null

/** Ensures an owner account exists, seeded from OWNER_EMAIL / OWNER_INITIAL_PASSWORD. */
export async function ensureOwnerBootstrap(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise
  bootstrapPromise = (async () => {
    const email = process.env.OWNER_EMAIL
    const password = process.env.OWNER_INITIAL_PASSWORD
    if (!email || !password) return

    const existing = await pool.query('SELECT id FROM admin_users WHERE lower(email) = lower($1) LIMIT 1', [
      email,
    ])
    if ((existing.rowCount ?? 0) > 0) return

    // Only seed an owner if no owner exists yet.
    const ownerCount = await pool.query("SELECT id FROM admin_users WHERE role = 'owner' LIMIT 1")
    if ((ownerCount.rowCount ?? 0) > 0) return

    const passwordHash = await hashPassword(password)
    await pool.query(
      `INSERT INTO admin_users (email, name, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'owner', true)
       ON CONFLICT (email) DO NOTHING`,
      [email, 'Owner', passwordHash],
    )
    await logAudit({ actorEmail: email, action: 'owner_bootstrap', details: { email } })
  })().catch(() => {
    // reset so a later request can retry
    bootstrapPromise = null
  })
  return bootstrapPromise
}

// ---------- Backward-compatible shim ----------

/** Legacy helper: true when a valid admin session exists. */
export async function verifyAuth(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}
