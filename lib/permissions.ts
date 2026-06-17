export type AdminRole = 'owner' | 'admin' | 'manager' | 'staff' | 'content_editor'

export const ROLES: AdminRole[] = ['owner', 'admin', 'manager', 'content_editor', 'staff']

export const ROLE_LABELS: Record<AdminRole, string> = {
  owner: 'Majiteľ',
  admin: 'Administrátor',
  manager: 'Manažér',
  content_editor: 'Editor obsahu',
  staff: 'Personál',
}

export type Capability =
  | 'cms:read'
  | 'cms:write'
  | 'users:read'
  | 'users:write'
  | 'users:manage_admins'
  // Work calendar
  | 'calendar:read_all' // view every staff member's shifts
  | 'calendar:read_own' // view only own shifts
  | 'calendar:write' // create / edit / cancel shifts
  | 'calendar:delete' // permanently delete shifts
  // Inventory / stock
  | 'inventory:read' // view items, stock, movements
  | 'inventory:write' // create / edit items, record stock movements
  | 'inventory:delete' // permanently delete inventory items

const ROLE_CAPABILITIES: Record<AdminRole, Capability[]> = {
  owner: [
    'cms:read',
    'cms:write',
    'users:read',
    'users:write',
    'users:manage_admins',
    'calendar:read_all',
    'calendar:read_own',
    'calendar:write',
    'calendar:delete',
    'inventory:read',
    'inventory:write',
    'inventory:delete',
  ],
  admin: [
    'cms:read',
    'cms:write',
    'users:read',
    'users:write',
    'users:manage_admins',
    'calendar:read_all',
    'calendar:read_own',
    'calendar:write',
    'calendar:delete',
    'inventory:read',
    'inventory:write',
    'inventory:delete',
  ],
  manager: [
    'cms:read',
    'cms:write',
    'users:read',
    'calendar:read_all',
    'calendar:read_own',
    'calendar:write',
    'inventory:read',
    'inventory:write',
  ],
  content_editor: ['cms:read', 'cms:write'],
  staff: ['cms:read', 'calendar:read_own'],
}

export function can(role: AdminRole | undefined | null, capability: Capability): boolean {
  if (!role) return false
  return ROLE_CAPABILITIES[role]?.includes(capability) ?? false
}

// Rank used to determine who can manage whom. Higher = more privileged.
const ROLE_RANK: Record<AdminRole, number> = {
  owner: 100,
  admin: 80,
  manager: 60,
  content_editor: 40,
  staff: 20,
}

export function roleRank(role: AdminRole): number {
  return ROLE_RANK[role] ?? 0
}

export function isValidRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && (ROLES as string[]).includes(value)
}

/**
 * Determines whether `actor` is allowed to create/modify/delete a user whose
 * role is `targetRole`. An actor may never act on a role equal to or above
 * their own rank, except the owner who can act on everyone (including admins).
 * No one can target the owner role except the owner themselves.
 */
export function canManageRole(actorRole: AdminRole, targetRole: AdminRole): boolean {
  if (!can(actorRole, 'users:write')) return false
  if (targetRole === 'owner') return actorRole === 'owner'
  if (actorRole === 'owner') return true
  // admins/managers may only manage roles strictly below their own rank
  return roleRank(actorRole) > roleRank(targetRole)
}
