import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { getAllergenDeclarations, upsertAllergenDeclaration } from '@/lib/haccp'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireCapability('haccp:view')
  if ('response' in auth) return auth.response
  const { searchParams } = request.nextUrl
  const recipeId = searchParams.get('recipeId') || undefined
  const data = await getAllergenDeclarations(recipeId)
  return NextResponse.json({ items: data })
}

export async function POST(request: NextRequest) {
  const auth = await requireCapability('haccp:settings')
  if ('response' in auth) return auth.response
  const body = await request.json()
  const item = await upsertAllergenDeclaration({ ...body, updatedBy: auth.user.id })
  return NextResponse.json({ item }, { status: 201 })
}
