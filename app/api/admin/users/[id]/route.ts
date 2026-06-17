import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { getUser, updateUser, deleteUser, countOwners } from '@/lib/users'
import { logAudit, destroyAllSessionsForUser } from '@/lib/auth'
import { canManageRole, isValidRole } from '@/lib/permissions'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCapability('users:write')
  if ('response' in auth) return auth.response
  const { id } = await params

  const target = await getUser(id)
  if (!target) {
    return NextResponse.json({ error: 'Používateľ neexistuje.' }, { status: 404 })
  }

  // Must be allowed to manage the target's current role.
  if (!canManageRole(auth.user.role, target.role)) {
    return NextResponse.json({ error: 'Nemáte oprávnenie upraviť tohto používateľa.' }, { status: 403 })
  }

  let body: { name?: string; role?: string; isActive?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatná požiadavka' }, { status: 400 })
  }

  const patch: { name?: string; role?: import('@/lib/permissions').AdminRole; isActive?: boolean } = {}

  if (typeof body.name === 'string') {
    const name = body.name.trim()
    if (!name) return NextResponse.json({ error: 'Meno nemôže byť prázdne.' }, { status: 400 })
    patch.name = name
  }

  if (body.role !== undefined) {
    if (!isValidRole(body.role)) {
      return NextResponse.json({ error: 'Neplatná rola.' }, { status: 400 })
    }
    // Must be allowed to assign the new role too.
    if (!canManageRole(auth.user.role, body.role)) {
      return NextResponse.json({ error: 'Nemáte oprávnenie priradiť túto rolu.' }, { status: 403 })
    }
    // Prevent demoting the last active owner.
    if (target.role === 'owner' && body.role !== 'owner' && (await countOwners()) <= 1) {
      return NextResponse.json({ error: 'Nemôžete zmeniť rolu poslednému majiteľovi.' }, { status: 400 })
    }
    // Prevent self-demotion lockout.
    if (target.id === auth.user.id && body.role !== auth.user.role) {
      return NextResponse.json({ error: 'Nemôžete zmeniť vlastnú rolu.' }, { status: 400 })
    }
    patch.role = body.role
  }

  if (typeof body.isActive === 'boolean') {
    if (target.id === auth.user.id && body.isActive === false) {
      return NextResponse.json({ error: 'Nemôžete deaktivovať vlastný účet.' }, { status: 400 })
    }
    if (target.role === 'owner' && body.isActive === false && (await countOwners()) <= 1) {
      return NextResponse.json({ error: 'Nemôžete deaktivovať posledného majiteľa.' }, { status: 400 })
    }
    patch.isActive = body.isActive
  }

  const updated = await updateUser(id, patch)
  if (updated && patch.isActive === false) {
    await destroyAllSessionsForUser(id)
  }
  await logAudit({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'user_updated',
    targetUserId: id,
    details: patch,
  })

  return NextResponse.json({ user: updated })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCapability('users:write')
  if ('response' in auth) return auth.response
  const { id } = await params

  const target = await getUser(id)
  if (!target) {
    return NextResponse.json({ error: 'Používateľ neexistuje.' }, { status: 404 })
  }
  if (target.id === auth.user.id) {
    return NextResponse.json({ error: 'Nemôžete odstrániť vlastný účet.' }, { status: 400 })
  }
  if (!canManageRole(auth.user.role, target.role)) {
    return NextResponse.json({ error: 'Nemáte oprávnenie odstrániť tohto používateľa.' }, { status: 403 })
  }
  if (target.role === 'owner' && (await countOwners()) <= 1) {
    return NextResponse.json({ error: 'Nemôžete odstrániť posledného majiteľa.' }, { status: 400 })
  }

  await deleteUser(id)
  await logAudit({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'user_deleted',
    targetUserId: id,
    details: { email: target.email, role: target.role },
  })

  return NextResponse.json({ success: true })
}
