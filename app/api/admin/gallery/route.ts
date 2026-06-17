import { NextResponse } from 'next/server'
import { getContent, setContent } from '@/lib/data'
import { requireCapability } from '@/lib/api-auth'
import { logAudit } from '@/lib/auth'

export async function GET() {
  const gallery = await getContent('gallery')
  return NextResponse.json(gallery)
}

async function save(request: Request) {
  const auth = await requireCapability('cms:write')
  if ('response' in auth) return auth.response

  const gallery = await request.json()
  await setContent('gallery', gallery)
  await logAudit({ actorUserId: auth.user.id, actorEmail: auth.user.email, action: 'cms_update', details: { key: 'gallery' } })
  return NextResponse.json({ success: true })
}

export const POST = save
export const PUT = save
