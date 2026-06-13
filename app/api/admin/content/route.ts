import { NextResponse } from 'next/server'
import { getContent, setContent } from '@/lib/data'
import { verifyAuth } from '@/lib/auth'

export async function GET() {
  const content = await getContent('content')
  return NextResponse.json(content)
}

export async function POST(request: Request) {
  const isAuth = await verifyAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const content = await request.json()
  await setContent('content', content)
  return NextResponse.json({ success: true })
}

export async function PUT(request: Request) {
  const isAuth = await verifyAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const content = await request.json()
  await setContent('content', content)
  return NextResponse.json({ success: true })
}
