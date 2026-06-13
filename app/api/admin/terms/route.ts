import { NextResponse } from 'next/server'
import { getContent, setContent } from '@/lib/data'
import { verifyAuth } from '@/lib/auth'

export async function GET() {
  const terms = await getContent('terms')
  return NextResponse.json(terms)
}

export async function POST(request: Request) {
  const isAuth = await verifyAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const terms = await request.json()
  await setContent('terms', terms)
  return NextResponse.json({ success: true })
}

export async function PUT(request: Request) {
  const isAuth = await verifyAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const terms = await request.json()
  await setContent('terms', terms)
  return NextResponse.json({ success: true })
}
