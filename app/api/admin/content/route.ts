import { NextResponse } from 'next/server'
import { getContent, setContent } from '@/lib/data'
import { requireCapability } from '@/lib/api-auth'
import { logAudit } from '@/lib/auth'

export async function GET() {
  const content = await getContent('content')
  return NextResponse.json(content)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Deep-merge incoming content over the existing stored content so a save never
 * wipes sections or unknown legacy fields. Objects merge recursively; arrays and
 * primitives from the incoming payload replace the existing value (so removing a
 * paragraph or clearing a field still works as expected).
 */
function deepMerge(target: unknown, source: unknown): unknown {
  if (!isPlainObject(target) || !isPlainObject(source)) return source
  const result: Record<string, unknown> = { ...target }
  for (const key of Object.keys(source)) {
    result[key] = deepMerge(target[key], source[key])
  }
  return result
}

async function save(request: Request) {
  const auth = await requireCapability('cms:write')
  if ('response' in auth) return auth.response

  const incoming = await request.json()
  const existing = await getContent('content')
  const merged = deepMerge(existing, incoming)
  await setContent('content', merged)
  await logAudit({ actorUserId: auth.user.id, actorEmail: auth.user.email, action: 'cms_update', details: { key: 'content' } })
  return NextResponse.json({ success: true })
}

export const POST = save
export const PUT = save
