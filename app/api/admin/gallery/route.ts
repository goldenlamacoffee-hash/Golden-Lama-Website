import { NextResponse } from 'next/server'
import { getContent, setContent } from '@/lib/data'
import { verifyAuth } from '@/lib/auth'

export async function GET() {
  const gallery = await getContent('gallery')
  return NextResponse.json(gallery)
}

export async function POST(request: Request) {
  const isAuth = await verifyAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const gallery = await request.json()
  await setContent('gallery', gallery)
  return NextResponse.json({ success: true })
}

export async function PUT(request: Request) {
  const isAuth = await verifyAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const gallery = await request.json()
  await setContent('gallery', gallery)
  return NextResponse.json({ success: true })
}
