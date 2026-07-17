import { NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import { getHaccpSettings, setHaccpSetting, getEquipment } from '@/lib/haccp'
import { pool } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireCapability('haccp:view')
  if ('response' in auth) return auth.response

  const [settings, equipment] = await Promise.all([
    getHaccpSettings(),
    getEquipment(),
  ])
  return NextResponse.json({ settings, equipment })
}

export async function POST(request: Request) {
  const auth = await requireCapability('haccp:settings')
  if ('response' in auth) return auth.response

  const body = await request.json()
  const { action } = body

  if (action === 'set_setting') {
    const { key, value } = body
    if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })
    await setHaccpSetting(key, value, auth.user.id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'upsert_equipment') {
    const { id, name, description, temp_min, temp_max, active, sort_order } = body
    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })
    if (id) {
      await pool.query(
        `UPDATE haccp_equipment SET name=$2, description=$3, temp_min=$4, temp_max=$5, active=$6, sort_order=$7
         WHERE id=$1`,
        [id, name, description ?? null, temp_min ?? null, temp_max ?? null, active ?? true, sort_order ?? 0]
      )
    } else {
      await pool.query(
        `INSERT INTO haccp_equipment (name, description, temp_min, temp_max, active, sort_order) VALUES ($1,$2,$3,$4,$5,$6)`,
        [name, description ?? null, temp_min ?? null, temp_max ?? null, active ?? true, sort_order ?? 0]
      )
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
