import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { getDailyCheckWithItems, upsertDailyCheck, logHaccpAudit } from '@/lib/haccp'
import { pool } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCapability('haccp:view')
  if ('response' in auth) return auth.response

  const { id } = await params
  const check = await getDailyCheckWithItems(id)
  if (!check) return NextResponse.json({ error: 'Záznam nenájdený.' }, { status: 404 })
  return NextResponse.json(check)
}

/** Correction of a locked record — requires haccp:correct + reason */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCapability('haccp:correct')
  if ('response' in auth) return auth.response

  const { id } = await params
  const body = await request.json()
  const { reason, items, notes } = body

  if (!reason?.trim()) {
    return NextResponse.json({ error: 'Dôvod opravy je povinný.' }, { status: 422 })
  }

  const existing = await getDailyCheckWithItems(id)
  if (!existing) return NextResponse.json({ error: 'Záznam nenájdený.' }, { status: 404 })

  // Force unlock temporarily to allow update
  await pool.query(`UPDATE haccp_daily_checks SET locked=false WHERE id=$1`, [id])

  try {
    await upsertDailyCheck({
      id,
      checkDate: existing.check_date,
      checkType: existing.check_type,
      location: existing.location,
      mainWorkerId: existing.main_worker_id,
      mainWorkerName: existing.main_worker_name,
      assistantWorkerName: existing.assistant_worker_name,
      notes: notes ?? existing.notes,
      items: items ?? existing.items.map((i: { item_key: string; item_label: string; result: string; note: string; sort_order: number }) => ({
        key: i.item_key, label: i.item_label, result: i.result, note: i.note, order: i.sort_order
      })),
      complete: true,
      completedById: auth.user.id,
    })
  } catch { /* ignore */ }

  // Re-lock
  await pool.query(`UPDATE haccp_daily_checks SET locked=true, status='corrected' WHERE id=$1`, [id])

  await logHaccpAudit({
    entityType: 'daily_check',
    entityId: id,
    action: 'check_corrected',
    userId: auth.user.id,
    userName: auth.user.name,
    oldValues: { items: existing.items, notes: existing.notes },
    newValues: { items, notes },
    reason,
  })

  return NextResponse.json({ ok: true })
}
