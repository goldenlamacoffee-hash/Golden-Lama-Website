import { NextResponse } from 'next/server'
import {
  ensureOwnerBootstrap,
  getUserByEmail,
  comparePassword,
  createSession,
  setSessionCookie,
  touchLastLogin,
  logAudit,
} from '@/lib/auth'

export async function POST(request: Request) {
  await ensureOwnerBootstrap()

  let email = ''
  let password = ''
  try {
    const body = await request.json()
    email = typeof body.email === 'string' ? body.email.trim() : ''
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return NextResponse.json({ error: 'Neplatná požiadavka' }, { status: 400 })
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Zadajte e-mail a heslo' }, { status: 400 })
  }

  const user = await getUserByEmail(email)
  // Always run a comparison to reduce timing differences, even if user missing.
  const validHash = user?.passwordHash ?? '$2a$12$0000000000000000000000000000000000000000000000000000'
  const passwordOk = await comparePassword(password, validHash)

  if (!user || !user.isActive || !passwordOk) {
    await logAudit({
      actorEmail: email,
      action: 'login_failed',
      details: { reason: !user ? 'no_user' : !user.isActive ? 'inactive' : 'bad_password' },
    })
    return NextResponse.json({ error: 'Nesprávny e-mail alebo heslo' }, { status: 401 })
  }

  const userAgent = request.headers.get('user-agent') ?? undefined
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    undefined

  const token = await createSession(user.id, { userAgent, ip })
  await setSessionCookie(token)
  await touchLastLogin(user.id)
  await logAudit({ actorUserId: user.id, actorEmail: user.email, action: 'login_success' })

  return NextResponse.json({
    success: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })
}
