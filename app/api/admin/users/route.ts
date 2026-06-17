import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { listUsers, createUser, emailExists } from '@/lib/users'
import { logAudit } from '@/lib/auth'
import { canManageRole, isValidRole } from '@/lib/permissions'
import { isValidEmail, validatePassword } from '@/lib/validation'

export async function GET() {
  const auth = await requireCapability('users:read')
  if ('response' in auth) return auth.response

  const users = await listUsers()
  return NextResponse.json({ users })
}

export async function POST(request: Request) {
  const auth = await requireCapability('users:write')
  if ('response' in auth) return auth.response

  let body: { email?: string; name?: string; password?: string; role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neplatná požiadavka' }, { status: 400 })
  }

  const email = (body.email ?? '').trim()
  const name = (body.name ?? '').trim()
  const password = body.password ?? ''
  const role = body.role ?? ''

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Zadajte platný e-mail.' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: 'Zadajte meno.' }, { status: 400 })
  }
  if (!isValidRole(role)) {
    return NextResponse.json({ error: 'Neplatná rola.' }, { status: 400 })
  }
  if (!canManageRole(auth.user.role, role)) {
    return NextResponse.json({ error: 'Nemáte oprávnenie priradiť túto rolu.' }, { status: 403 })
  }
  const pw = validatePassword(password)
  if (!pw.ok) {
    return NextResponse.json({ error: pw.message }, { status: 400 })
  }
  if (await emailExists(email)) {
    return NextResponse.json({ error: 'Používateľ s týmto e-mailom už existuje.' }, { status: 409 })
  }

  const user = await createUser({ email, name, password, role })
  await logAudit({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'user_created',
    targetUserId: user.id,
    details: { email: user.email, role: user.role },
  })

  return NextResponse.json({ user }, { status: 201 })
}
