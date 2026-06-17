import { NextResponse } from 'next/server'
import { getContent, setContent } from '@/lib/data'
import { requireCapability } from '@/lib/api-auth'
import { logAudit } from '@/lib/auth'

export async function GET() {
  const content = await getContent('content')
  return NextResponse.json(content)
}

async function save(request: Request) {
  const auth = await requireCapability('cms:write')
  if ('response' in auth) return auth.response

  const content = await request.json()
  await setContent('content', content)
  await logAudit({ actorUserId: auth.user.id, actorEmail: auth.user.email, action: 'cms_update', details: { key: 'content' } })
  return NextResponse.json({ success: true })
}

export const POST = save
export const PUT = save
