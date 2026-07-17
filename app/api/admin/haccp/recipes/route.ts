import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { getRecipes, upsertRecipe, logHaccpAudit } from '@/lib/haccp'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireCapability('haccp:view')
  if ('response' in auth) return auth.response
  return NextResponse.json(await getRecipes())
}

export async function POST(request: Request) {
  const auth = await requireCapability('haccp:settings')
  if ('response' in auth) return auth.response

  const body = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Chýba názov receptúry.' }, { status: 400 })

  const id = await upsertRecipe(body)

  await logHaccpAudit({
    entityType: 'recipe',
    entityId: id,
    action: body.id ? 'recipe_updated' : 'recipe_created',
    userId: auth.user.id,
    userName: auth.user.name,
  })

  return NextResponse.json({ id })
}
