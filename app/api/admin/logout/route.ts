import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, destroySession, clearSessionCookie, getCurrentUser, logAudit } from '@/lib/auth'

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const user = await getCurrentUser()
  if (token) {
    await destroySession(token)
  }
  if (user) {
    await logAudit({ actorUserId: user.id, actorEmail: user.email, action: 'logout' })
  }
  await clearSessionCookie()
  return NextResponse.json({ success: true })
}
