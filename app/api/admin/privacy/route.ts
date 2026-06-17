import { NextResponse } from 'next/server'
import { getContent, setContent } from '@/lib/data'
import { requireCapability } from '@/lib/api-auth'
import { logAudit } from '@/lib/auth'

export async function GET() {
  const privacy = await getContent('privacy')
  return NextResponse.json(privacy)
}

async function save(request: Request) {
  const auth = await requireCapability('cms:write')
  if ('response' in auth) return auth.response

  const privacy = await request.json()
  await setContent('privacy', privacy)
  await logAudit({ actorUserId: auth.user.id, actorEmail: auth.user.email, action: 'cms_update', details: { key: 'privacy' } })
  return NextResponse.json({ success: true })
}

export const POST = save
export const PUT = save
