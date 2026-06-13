import { NextResponse } from 'next/server'
import { getContent, setContent } from '@/lib/data'
import { verifyAuth } from '@/lib/auth'

export async function GET() {
  const privacy = await getContent('privacy')
  return NextResponse.json(privacy)
}

export async function POST(request: Request) {
  const isAuth = await verifyAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const privacy = await request.json()
  await setContent('privacy', privacy)
  return NextResponse.json({ success: true })
}

export async function PUT(request: Request) {
  const isAuth = await verifyAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const privacy = await request.json()
  await setContent('privacy', privacy)
  return NextResponse.json({ success: true })
}
