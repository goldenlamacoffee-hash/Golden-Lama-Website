import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { getTrainingRecords, createTrainingRecord, logHaccpAudit } from '@/lib/haccp'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireCapability('haccp:view')
  if ('response' in auth) return auth.response
  const { searchParams } = request.nextUrl
  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined
  return NextResponse.json(await getTrainingRecords({ from, to }))
}

export async function POST(request: NextRequest) {
  const auth = await requireCapability('haccp:settings')
  if ('response' in auth) return auth.response
  const body = await request.json()
  if (!body.employeeName?.trim()) return NextResponse.json({ error: 'Chýba meno zamestnanca.' }, { status: 400 })
  if (!body.topic?.trim()) return NextResponse.json({ error: 'Chýba téma školenia.' }, { status: 400 })
  if (!body.trainingDate) return NextResponse.json({ error: 'Chýba dátum školenia.' }, { status: 400 })
  const item = await createTrainingRecord({ ...body, confirmedById: body.confirmed ? auth.user.id : null })
  await logHaccpAudit({ entityType: 'training', entityId: item.id, action: 'training_created', userId: auth.user.id, userName: auth.user.name })
  return NextResponse.json(item, { status: 201 })
}
