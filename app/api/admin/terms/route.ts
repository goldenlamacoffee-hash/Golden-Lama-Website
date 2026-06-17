import { NextResponse } from 'next/server'
import { getContent, setContent } from '@/lib/data'
import { requireCapability } from '@/lib/api-auth'
import { logAudit } from '@/lib/auth'

export async function GET() {
  const terms = await getContent('terms')
  return NextResponse.json(terms)
}

async function save(request: Request) {
  const auth = await requireCapability('cms:write')
  if ('response' in auth) return auth.response

  const terms = await request.json()
  await setContent('terms', terms)
  await logAudit({ actorUserId: auth.user.id, actorEmail: auth.user.email, action: 'cms_update', details: { key: 'terms' } })
  return NextResponse.json({ success: true })
}

export const POST = save
export const PUT = save
