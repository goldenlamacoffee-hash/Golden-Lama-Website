import { NextRequest, NextResponse } from 'next/server'
import { requireCapability } from '@/lib/api-auth'
import {
  exportDailyChecks,
  exportTemperatures,
  exportSanitation,
  exportWaterChecks,
  exportReceiving,
  exportDiscards,
  exportNonConformities,
  exportPestControl,
  exportMaintenance,
  exportTraining,
  exportFullInspectionReport,
} from '@/lib/haccp-export'

const EXPORTERS: Record<string, (from: string, to: string) => Promise<Buffer>> = {
  'daily-checks': exportDailyChecks,
  temperatures: exportTemperatures,
  sanitation: exportSanitation,
  water: exportWaterChecks,
  receiving: exportReceiving,
  discards: exportDiscards,
  'non-conformities': exportNonConformities,
  'pest-control': exportPestControl,
  maintenance: exportMaintenance,
  training: exportTraining,
  'full-report': exportFullInspectionReport,
}

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const auth = await requireCapability('haccp:exports')
  if ('response' in auth) return auth.response

  const { searchParams } = request.nextUrl
  const type = searchParams.get('type') || ''
  const from = searchParams.get('from') || new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
  const to = searchParams.get('to') || new Date().toISOString().slice(0, 10)

  const exporter = EXPORTERS[type]
  if (!exporter) return NextResponse.json({ error: 'Unknown export type' }, { status: 400 })

  try {
    const buffer = await exporter(from, to)
    const filename = `haccp-${type}-${from}-${to}.xlsx`
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[haccp exports]', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
