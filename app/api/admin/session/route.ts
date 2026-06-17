import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'

export async function GET() {
  const result = await requireUser()
  if ('response' in result) return result.response
  const { user } = result
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })
}
