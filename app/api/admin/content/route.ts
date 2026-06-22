import { NextResponse } from 'next/server'
import { getContent, setContent } from '@/lib/data'
import { requireCapability } from '@/lib/api-auth'
import { logAudit } from '@/lib/auth'
import { sanitizeRichText } from '@/lib/rich-text'

export async function GET() {
  const content = await getContent('content')
  return NextResponse.json(content)
}

/**
 * Rich-text fields are sanitized again on the server (defense-in-depth) so the
 * stored value can never contain scripts/handlers even if a request bypasses the
 * editor. Paths are dot-notation into the content object.
 */
const RICH_TEXT_PATHS = [
  'about.body',
  'events.description',
  'app.description',
  'contact.subtitle',
  'footer.text',
]

function sanitizeRichTextFields(content: unknown): void {
  if (!isPlainObject(content)) return
  for (const path of RICH_TEXT_PATHS) {
    const [section, field] = path.split('.')
    const obj = content[section]
    if (isPlainObject(obj) && typeof obj[field] === 'string') {
      obj[field] = sanitizeRichText(obj[field] as string)
    }
  }
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
  sanitizeRichTextFields(merged)
  await setContent('content', merged)
  await logAudit({ actorUserId: auth.user.id, actorEmail: auth.user.email, action: 'cms_update', details: { key: 'content' } })
  return NextResponse.json({ success: true })
}

export const POST = save
export const PUT = save
