import { NextResponse } from 'next/server'
import { getCurrentUser, ensureOwnerBootstrap, type AdminUser } from './auth'
import { can, type Capability } from './permissions'

export type GuardResult = { user: AdminUser } | { response: NextResponse }

/** Loads the current user (after ensuring owner bootstrap) or returns a 401 response. */
export async function requireUser(): Promise<GuardResult> {
  await ensureOwnerBootstrap()
  const user = await getCurrentUser()
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { user }
}

/** Loads the current user and enforces a capability, or returns 401/403. */
export async function requireCapability(capability: Capability): Promise<GuardResult> {
  const result = await requireUser()
  if ('response' in result) return result
  if (!can(result.user.role, capability)) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return result
}
