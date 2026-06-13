import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { checkPassword } from '@/lib/auth'

export async function POST(request: Request) {
  const { password } = await request.json()
  
  if (checkPassword(password)) {
    const cookieStore = await cookies()
    const isProduction = process.env.NODE_ENV === 'production'
    
    cookieStore.set('admin_token', 'authenticated', {
      httpOnly: true,
      secure: true,
      sameSite: isProduction ? 'lax' : 'none',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
}
