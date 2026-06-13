import { NextResponse } from 'next/server'
import { getContent, setContent } from '@/lib/data'
import { verifyAuth } from '@/lib/auth'

export async function GET() {
  const schedule = await getContent('schedule')
  return NextResponse.json(schedule)
}

export async function POST(request: Request) {
  const isAuth = await verifyAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const schedule = await request.json()
  await setContent('schedule', schedule)
  return NextResponse.json({ success: true })
}

export async function PUT(request: Request) {
  const isAuth = await verifyAuth()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const schedule = await request.json()
  await setContent('schedule', schedule)
  return NextResponse.json({ success: true })
}
