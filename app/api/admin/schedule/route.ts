import { NextResponse } from 'next/server'
import { getContent, setContent } from '@/lib/data'
import { requireCapability } from '@/lib/api-auth'
import { logAudit } from '@/lib/auth'

export async function GET() {
  const schedule = await getContent('schedule')
  return NextResponse.json(schedule)
}

async function save(request: Request) {
  const auth = await requireCapability('cms:write')
  if ('response' in auth) return auth.response

  const schedule = await request.json()
  await setContent('schedule', schedule)
  await logAudit({ actorUserId: auth.user.id, actorEmail: auth.user.email, action: 'cms_update', details: { key: 'schedule' } })
  return NextResponse.json({ success: true })
}

export const POST = save
export const PUT = save
