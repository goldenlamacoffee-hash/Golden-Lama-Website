import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { getHaccpManual, upsertHaccpManual, logHaccpAudit } from '@/lib/haccp'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireCapability('haccp:view')
  if ('response' in auth) return auth.response
  return NextResponse.json({ manual: await getHaccpManual() })
}

export async function PUT(request: NextRequest) {
  const auth = await requireCapability('haccp:settings')
  if ('response' in auth) return auth.response
  const body = await request.json()
  if (!body.version?.trim() || !body.title?.trim()) {
    return NextResponse.json({ error: 'Chýba verzia alebo názov.' }, { status: 400 })
  }
  const manual = await upsertHaccpManual({ ...body, createdBy: auth.user.id })
  await logHaccpAudit({ entityType: 'manual', entityId: manual?.id ?? body.id, action: body.id ? 'manual_updated' : 'manual_created', userId: auth.user.id, userName: auth.user.name })
  return NextResponse.json({ manual })
}
