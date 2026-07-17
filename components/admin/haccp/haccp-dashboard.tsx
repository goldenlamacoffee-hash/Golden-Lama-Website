"use client"

import Link from 'next/link'
import {
  ClipboardCheck, Thermometer, Sparkles, Droplets, PackageCheck,
  Trash2, AlertTriangle, Bug, Wrench, CheckCircle2, XCircle,
  Clock, TrendingUp, ChevronRight,
} from 'lucide-react'

interface DashboardSummary {
  date: string
  opening: { status: string; locked: boolean } | null
  closing: { status: string; locked: boolean } | null
  temps: { total: number; outside: number }
  sanitation: { total: number; nok: number }
  waterChecked: boolean
  openNonConformities: Array<{ id: string; severity: string; status: string }>
  lastReceiving: { id: string; supplier_name: string; product: string; received_at: string } | null
  discardCount: number
  upcomingMaintenance: Array<{ id: string; equipment: string; next_service_date: string }>
}

interface HaccpDashboardProps {
  summary: DashboardSummary
  today: string
  canWrite: boolean
  canSettings: boolean
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
      ok ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'
    }`}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </span>
  )
}

function CheckCard({
  title,
  href,
  icon: Icon,
  status,
  detail,
  warn,
}: {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  status: 'ok' | 'warn' | 'missing' | 'pending'
  detail: string
  warn?: boolean
}) {
  const colors = {
    ok: 'border-green-800/40 bg-green-900/10',
    warn: 'border-yellow-700/40 bg-yellow-900/10',
    missing: 'border-[#8C6F4E]/30 bg-[#3a251a]',
    pending: 'border-[#8C6F4E]/30 bg-[#3a251a]',
  }
  const iconColors = {
    ok: 'text-green-400',
    warn: 'text-yellow-400',
    missing: 'text-[#8C6F4E]',
    pending: 'text-[#E09E14]',
  }

  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-xl border p-4 transition-colors hover:border-[#E09E14]/50 group ${colors[status]}`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#28170F]/60`}>
          <Icon className={`h-4.5 w-4.5 ${iconColors[status]}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-[#F5E3C2]">{title}</p>
          <p className="text-xs text-[#8C6F4E]">{detail}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-[#8C6F4E] group-hover:text-[#E09E14] transition-colors shrink-0" />
    </Link>
  )
}

function ncSeverityLabel(s: string) {
  const map: Record<string, string> = { critical: 'Kritická', high: 'Vysoká', medium: 'Stredná', low: 'Nízka' }
  return map[s] ?? s
}
function ncSeverityColor(s: string) {
  const map: Record<string, string> = {
    critical: 'text-red-400 bg-red-900/30',
    high: 'text-orange-400 bg-orange-900/30',
    medium: 'text-yellow-400 bg-yellow-900/30',
    low: 'text-blue-400 bg-blue-900/30',
  }
  return map[s] ?? 'text-[#8C6F4E]'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('sk-SK')
}

export function HaccpDashboard({ summary, today, canWrite }: HaccpDashboardProps) {
  const openingStatus =
    summary.opening?.status === 'completed' ? 'ok'
    : summary.opening ? 'pending'
    : 'missing'

  const closingStatus =
    summary.closing?.status === 'completed' ? 'ok'
    : summary.closing ? 'pending'
    : 'missing'

  const tempStatus =
    summary.temps.outside > 0 ? 'warn'
    : summary.temps.total === 0 ? 'missing'
    : 'ok'

  const sanitationStatus =
    summary.sanitation.nok > 0 ? 'warn'
    : summary.sanitation.total === 0 ? 'missing'
    : 'ok'

  const criticalNc = summary.openNonConformities.filter(n => n.severity === 'critical' || n.severity === 'high')
  const hasUrgentIssues = criticalNc.length > 0 || summary.temps.outside > 0

  const displayDate = new Date(today).toLocaleDateString('sk-SK', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-[#F5E3C2]">HACCP Prehľad</h1>
          <p className="mt-0.5 text-sm text-[#8C6F4E] capitalize">{displayDate}</p>
        </div>
        {canWrite && (
          <Link
            href="/admin/haccp/daily-checks"
            className="shrink-0 rounded-lg bg-[#E09E14] px-4 py-2 text-sm font-semibold text-[#28170F] hover:bg-[#E09E14]/90 transition-colors"
          >
            Pridať záznam
          </Link>
        )}
      </div>

      {/* Urgent alert banner */}
      {hasUrgentIssues && (
        <div className="rounded-xl border border-red-700/50 bg-red-900/20 px-4 py-3">
          <div className="flex items-center gap-2 text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-sm font-medium">
              {criticalNc.length > 0 && `${criticalNc.length} kritická/é nezhoda/y. `}
              {summary.temps.outside > 0 && `${summary.temps.outside} záznam(ov) teploty mimo limitu. `}
              Vyžaduje sa okamžitá pozornosť.
            </p>
          </div>
        </div>
      )}

      {/* Today's operational checks */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#8C6F4E]">Dnešné operačné záznamy</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CheckCard
            title="Otváracie kontroly"
            href="/admin/haccp/daily-checks"
            icon={ClipboardCheck}
            status={openingStatus}
            detail={
              openingStatus === 'ok' ? 'Dokončené' :
              openingStatus === 'pending' ? 'Rozpracované' :
              'Ešte nevyplnené'
            }
          />
          <CheckCard
            title="Záveracie kontroly"
            href="/admin/haccp/daily-checks"
            icon={ClipboardCheck}
            status={closingStatus}
            detail={
              closingStatus === 'ok' ? 'Dokončené' :
              closingStatus === 'pending' ? 'Rozpracované' :
              'Ešte nevyplnené'
            }
          />
          <CheckCard
            title="Teploty"
            href="/admin/haccp/temperatures"
            icon={Thermometer}
            status={tempStatus}
            detail={
              summary.temps.total === 0 ? 'Žiadne záznamy dnes' :
              summary.temps.outside > 0 ? `${summary.temps.outside}/${summary.temps.total} mimo limitu` :
              `${summary.temps.total} záznamov — v poriadku`
            }
          />
          <CheckCard
            title="Sanitácia"
            href="/admin/haccp/sanitation"
            icon={Sparkles}
            status={sanitationStatus}
            detail={
              summary.sanitation.total === 0 ? 'Žiadne záznamy dnes' :
              summary.sanitation.nok > 0 ? `${summary.sanitation.nok}/${summary.sanitation.total} nevyhovuje` :
              `${summary.sanitation.total} záznamov — vyhovuje`
            }
          />
          <CheckCard
            title="Manipulácia s vodou"
            href="/admin/haccp/water"
            icon={Droplets}
            status={summary.waterChecked ? 'ok' : 'missing'}
            detail={summary.waterChecked ? 'Záznam vyplnený' : 'Ešte nevyplnené'}
          />
          <CheckCard
            title="Vyradené výrobky"
            href="/admin/haccp/discards"
            icon={Trash2}
            status={summary.discardCount > 0 ? 'ok' : 'missing'}
            detail={summary.discardCount > 0 ? `${summary.discardCount} záznamy` : 'Žiadne dnes'}
          />
        </div>
      </section>

      {/* Non-conformities */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8C6F4E]">Otvorené nezhody</h2>
          <Link href="/admin/haccp/non-conformities" className="text-xs text-[#E09E14] hover:underline">
            Zobraziť všetky
          </Link>
        </div>
        {summary.openNonConformities.length === 0 ? (
          <div className="rounded-xl border border-[#8C6F4E]/20 bg-[#3a251a] px-4 py-3 flex items-center gap-2 text-sm text-[#8C6F4E]">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            Žiadne otvorené nezhody
          </div>
        ) : (
          <div className="rounded-xl border border-[#8C6F4E]/30 bg-[#3a251a] divide-y divide-[#8C6F4E]/15">
            {summary.openNonConformities.slice(0, 5).map(nc => (
              <Link
                key={nc.id}
                href="/admin/haccp/non-conformities"
                className="flex items-center justify-between px-4 py-3 hover:bg-[#8C6F4E]/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-3.5 w-3.5 ${nc.severity === 'critical' || nc.severity === 'high' ? 'text-red-400' : 'text-yellow-400'}`} />
                  <span className="text-xs text-[#F5E3C2]">
                    {nc.status === 'open' ? 'Otvorená' : 'Rieši sa'}
                  </span>
                </div>
                <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium ${ncSeverityColor(nc.severity)}`}>
                  {ncSeverityLabel(nc.severity)}
                </span>
              </Link>
            ))}
            {summary.openNonConformities.length > 5 && (
              <div className="px-4 py-2 text-xs text-[#8C6F4E] text-center">
                +{summary.openNonConformities.length - 5} ďalších
              </div>
            )}
          </div>
        )}
      </section>

      {/* Bottom row: receiving + maintenance */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Last receiving */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8C6F4E]">Posledný príjem surovín</h2>
            <Link href="/admin/haccp/receiving" className="text-xs text-[#E09E14] hover:underline">
              Všetky príjmy
            </Link>
          </div>
          {summary.lastReceiving ? (
            <div className="rounded-xl border border-[#8C6F4E]/30 bg-[#3a251a] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E09E14]/10">
                  <PackageCheck className="h-4 w-4 text-[#E09E14]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#F5E3C2] truncate">{summary.lastReceiving.product}</p>
                  <p className="text-xs text-[#8C6F4E]">{summary.lastReceiving.supplier_name}</p>
                  <p className="text-xs text-[#8C6F4E]">{fmtDate(summary.lastReceiving.received_at)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#8C6F4E]/20 bg-[#3a251a] px-4 py-3 text-sm text-[#8C6F4E]">
              Žiadny príjem tento mesiac
            </div>
          )}
        </section>

        {/* Upcoming maintenance */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8C6F4E]">Nadchádzajúca údržba</h2>
            <Link href="/admin/haccp/maintenance" className="text-xs text-[#E09E14] hover:underline">
              Všetka údržba
            </Link>
          </div>
          {summary.upcomingMaintenance.length === 0 ? (
            <div className="rounded-xl border border-[#8C6F4E]/20 bg-[#3a251a] px-4 py-3 flex items-center gap-2 text-sm text-[#8C6F4E]">
              <TrendingUp className="h-4 w-4 text-green-400" />
              Žiadna plánovaná údržba v najbližších 14 dňoch
            </div>
          ) : (
            <div className="rounded-xl border border-[#8C6F4E]/30 bg-[#3a251a] divide-y divide-[#8C6F4E]/15">
              {summary.upcomingMaintenance.map(m => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-3.5 w-3.5 text-[#E09E14]" />
                    <span className="text-sm text-[#F5E3C2]">{m.equipment}</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-[#8C6F4E]">
                    <Clock className="h-3 w-3" />
                    {fmtDate(m.next_service_date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
