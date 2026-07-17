import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { getIngredients, upsertIngredient, logHaccpAudit } from '@/lib/haccp'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireCapability('haccp:view')
  if ('response' in auth) return auth.response
  return NextResponse.json(await getIngredients())
}

export async function POST(request: Request) {
  const auth = await requireCapability('haccp:settings')
  if ('response' in auth) return auth.response

  const body = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Chýba názov suroviny.' }, { status: 400 })
  if (!body.category?.trim()) return NextResponse.json({ error: 'Chýba kategória.' }, { status: 400 })

  const id = await upsertIngredient(body)

  await logHaccpAudit({
    entityType: 'ingredient',
    entityId: id,
    action: body.id ? 'ingredient_updated' : 'ingredient_created',
    userId: auth.user.id,
    userName: auth.user.name,
  })

  return NextResponse.json({ id })
}
