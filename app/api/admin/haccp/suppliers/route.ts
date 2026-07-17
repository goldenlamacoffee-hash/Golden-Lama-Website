import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { getSuppliers, upsertSupplier, logHaccpAudit } from '@/lib/haccp'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireCapability('haccp:view')
  if ('response' in auth) return auth.response
  return NextResponse.json(await getSuppliers())
}

export async function POST(request: Request) {
  const auth = await requireCapability('haccp:settings')
  if ('response' in auth) return auth.response

  const body = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Chýba názov dodávateľa.' }, { status: 400 })

  const supplier = await upsertSupplier(body)

  await logHaccpAudit({
    entityType: 'supplier',
    entityId: supplier?.id ?? body.id,
    action: body.id ? 'supplier_updated' : 'supplier_created',
    userId: auth.user.id,
    userName: auth.user.name,
  })

  return NextResponse.json(supplier)
}
