import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api-auth'
import { can, type Capability } from '@/lib/permissions'
import { logAudit } from '@/lib/auth'
import {
  getShiftReport,
  getAbsenceReport,
  getPointsReport,
  getInventoryReport,
  getUserReport,
  isMovementType,
  isPointCategory,
  isPointSource,
  REPORT_TYPES,
  type ReportType,
} from '@/lib/reports'
import { buildXlsx, buildCsv, reportFilename, type ReportData } from '@/lib/report-export'
import type { ShiftStatus, EntryType } from '@/lib/shifts'
import { ABSENCE_TYPES } from '@/lib/shifts'
import type { PointEventStatus } from '@/lib/motivation'

export const runtime = 'nodejs'

const TYPE_CAPABILITY: Record<ReportType, Capability> = {
  shifts: 'reports:shifts',
  absences: 'reports:absences',
  points: 'reports:points',
  inventory: 'reports:inventory',
  users: 'reports:users',
}

const SHIFT_STATUSES: ShiftStatus[] = ['draft', 'published', 'cancelled']
const POINT_STATUSES: PointEventStatus[] = ['active', 'reversed', 'cancelled']

/** Validates a YYYY-MM-DD string. */
function isDate(v: string | null): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

/** Default range: first to last day of the current month (UTC). */
function defaultRange(): { from: string; to: string } {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const pad = (n: number) => String(n).padStart(2, '0')
  const first = `${y}-${pad(m + 1)}-01`
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const last = `${y}-${pad(m + 1)}-${pad(lastDay)}`
  return { from: first, to: last }
}

export async function GET(request: Request) {
  const auth = await requireUser()
  if ('response' in auth) return auth.response

  const url = new URL(request.url)
  const typeParam = url.searchParams.get('type')
  if (!typeParam || !(REPORT_TYPES as string[]).includes(typeParam)) {
    return NextResponse.json({ error: 'Neznámy typ reportu.' }, { status: 400 })
  }
  const type = typeParam as ReportType

  // Server-side permission enforcement per report type.
  if (!can(auth.user.role, TYPE_CAPABILITY[type])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formatParam = url.searchParams.get('format')
  const format: 'xlsx' | 'csv' = formatParam === 'csv' ? 'csv' : 'xlsx'

  // Resolve & validate date range (default current month).
  const def = defaultRange()
  const fromRaw = url.searchParams.get('from')
  const toRaw = url.searchParams.get('to')
  const from = isDate(fromRaw) ? fromRaw : def.from
  const to = isDate(toRaw) ? toRaw : def.to

  const staffUserId = url.searchParams.get('staff') || undefined
  const statusRaw = url.searchParams.get('status')

  let report: ReportData
  try {
    switch (type) {
      case 'shifts': {
        const status = SHIFT_STATUSES.includes(statusRaw as ShiftStatus) ? (statusRaw as ShiftStatus) : undefined
        const location = url.searchParams.get('location') || undefined
        report = { type, data: await getShiftReport({ from, to, staffUserId, status, location }) }
        break
      }
      case 'absences': {
        const status = SHIFT_STATUSES.includes(statusRaw as ShiftStatus) ? (statusRaw as ShiftStatus) : undefined
        const typeRaw = url.searchParams.get('absenceType')
        const entryType =
          typeRaw && (ABSENCE_TYPES as string[]).includes(typeRaw) ? (typeRaw as EntryType) : undefined
        report = { type, data: await getAbsenceReport({ from, to, staffUserId, entryType, status }) }
        break
      }
      case 'points': {
        const status = POINT_STATUSES.includes(statusRaw as PointEventStatus)
          ? (statusRaw as PointEventStatus)
          : undefined
        const categoryRaw = url.searchParams.get('category')
        const sourceRaw = url.searchParams.get('source')
        report = {
          type,
          data: await getPointsReport({
            from,
            to,
            staffUserId,
            category: isPointCategory(categoryRaw) ? categoryRaw : undefined,
            source: isPointSource(sourceRaw) ? sourceRaw : undefined,
            status,
          }),
        }
        break
      }
      case 'inventory': {
        const itemId = url.searchParams.get('item') || undefined
        const movementRaw = url.searchParams.get('movementType')
        const createdBy = url.searchParams.get('createdBy') || undefined
        report = {
          type,
          data: await getInventoryReport({
            from,
            to,
            itemId,
            movementType: isMovementType(movementRaw) ? movementRaw : undefined,
            createdBy,
          }),
        }
        break
      }
      case 'users': {
        report = { type, data: await getUserReport() }
        break
      }
    }
  } catch (err) {
    console.log('[v0] report export error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Export sa nepodaril.' }, { status: 500 })
  }

  // Audit the export (best-effort; never blocks the download).
  await logAudit({
    actorUserId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'report_exported',
    details: { type, format, from: type === 'users' ? null : from, to: type === 'users' ? null : to },
  })

  const filename = reportFilename(type, format, type === 'users' ? undefined : from, type === 'users' ? undefined : to)

  if (format === 'csv') {
    const csv = buildCsv(report)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  const buffer = await buildXlsx(report, type === 'users' ? '' : `${from} – ${to}`)
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
