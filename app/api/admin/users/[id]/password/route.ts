import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { getUser, setUserPassword } from '@/lib/users'
import { logAudit } from '@/lib/auth'
import { canManageRole } from '@/lib/permissions'
import { validatePassword } from '@/lib/validation'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCapability('users:write')
  if ('response' in auth) return auth.response
  const { id } = await params

  const target = await getUser(id)
  if (!target) {
    return NextResponse.json({ error: 'Používateľ neexistuje.' }, { status: 404 })
  }
  // Allow resetting own password, otherwise require management rights over target role.
  if (target.id !== auth.user.id && !canManageRole(auth.user.role, target.role)) {
    return NextResponse.json({ error: 'Nemáte oprávnenie zmeniť toto heslo.' }, { status: 403 })
  }

  let body: { password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatná požiadavka' }, { status: 400 })
  }

  const check = validatePassword(body.password ?? '')
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 })
  }

  await setUserPassword(id, body.password as string)
  await logAudit({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'password_reset',
    targetUserId: id,
    details: { email: target.email, self: target.id === auth.user.id },
  })

  return NextResponse.json({ success: true })
}
