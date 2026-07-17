import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { getDailyChecks, upsertDailyCheck, logHaccpAudit } from '@/lib/haccp'

export const runtime = 'nodejs'

function defaultRange() {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return { from: `${y}-${m}-01`, to: `${y}-${m}-${String(new Date(y, now.getUTCMonth() + 1, 0).getDate()).padStart(2, '0')}` }
}

function isDate(v: string | null): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

export async function GET(request: Request) {
  const auth = await requireCapability('haccp:view')
  if ('response' in auth) return auth.response

  const url = new URL(request.url)
  const def = defaultRange()
  const from = isDate(url.searchParams.get('from')) ? url.searchParams.get('from')! : def.from
  const to = isDate(url.searchParams.get('to')) ? url.searchParams.get('to')! : def.to
  const type = url.searchParams.get('type') || undefined

  const checks = await getDailyChecks({ from, to, type })
  return NextResponse.json(checks)
}

export async function POST(request: Request) {
  const auth = await requireCapability('haccp:write')
  if ('response' in auth) return auth.response

  const body = await request.json()
  const { id, checkDate, checkType, location, mainWorkerId, mainWorkerName, assistantWorkerName, notes, items, complete } = body

  if (!checkDate || !checkType) {
    return NextResponse.json({ error: 'Chýba dátum alebo typ kontroly.' }, { status: 400 })
  }
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'Chýbajú položky kontroly.' }, { status: 400 })
  }
  // NOK items must have a note
  const nokWithoutNote = items.filter((i: { result: string; note?: string }) => i.result === 'nok' && !i.note?.trim())
  if (nokWithoutNote.length > 0) {
    return NextResponse.json({ error: 'Každá položka NOK musí mať poznámku.' }, { status: 422 })
  }

  try {
    const checkId = await upsertDailyCheck({
      id, checkDate, checkType, location, mainWorkerId, mainWorkerName,
      assistantWorkerName, notes, items, complete,
      completedById: auth.user.id,
      completedByName: auth.user.name,
    })

    await logHaccpAudit({
      entityType: 'daily_check',
      entityId: checkId,
      action: complete ? 'check_completed' : id ? 'check_updated' : 'check_created',
      userId: auth.user.id,
      userName: auth.user.name,
    })

    return NextResponse.json({ id: checkId })
  } catch (err) {
    if (err instanceof Error && err.message === 'LOCKED') {
      return NextResponse.json({ error: 'Záznam je uzamknutý a nemôže byť zmenený.' }, { status: 409 })
    }
    throw err
  }
}
