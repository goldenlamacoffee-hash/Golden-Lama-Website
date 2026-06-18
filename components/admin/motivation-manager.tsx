"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  LogOut,
  Loader2,
  Plus,
  Trophy,
  Sparkles,
  Users,
  Coffee,
  Heart,
  Target,
  Euro,
  Pencil,
  Ban,
  Settings2,
  ListChecks,
  ClipboardList,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types (mirror lib/motivation.ts shapes returned by the API)
// ---------------------------------------------------------------------------

type PointCategory =
  | "sales"
  | "customer_smile"
  | "team_help"
  | "reliability"
  | "cleanliness_preparation"
  | "event_energy"
  | "bonus"
  | "correction"

const CATEGORY_LABELS: Record<PointCategory, string> = {
  sales: "Predaj",
  customer_smile: "Zákaznícky úsmev",
  team_help: "Tímová pomoc",
  reliability: "Spoľahlivosť",
  cleanliness_preparation: "Čistota & príprava",
  event_energy: "Event energia",
  bonus: "Bonus",
  correction: "Korekcia",
}

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [PointCategory, string][]

interface StaffMember {
  id: string
  name: string
  email: string
  role: string
}

interface PointRule {
  id: string
  name: string
  category: PointCategory
  productName: string | null
  pointsPerUnit: number
  bonusPoints: number | null
  isActive: boolean
  notes: string | null
}

interface PointEvent {
  id: string
  staffUserId: string
  staffName: string | null
  category: PointCategory
  source: string
  ruleName: string | null
  productName: string | null
  quantity: number
  pointsPerUnit: number
  totalPoints: number
  note: string | null
  happenedAt: string
  status: string
  createdByName: string | null
}

interface Breakdown {
  sales: number
  experience: number
  team: number
  other: number
  total: number
}

interface LeaderboardEntry {
  staffUserId: string
  staffName: string
  staffEmail: string
  role: string
  breakdown: Breakdown
  multiplier: number
  finalPoints: number
  estimatedBonus: number
  workedHours: number
  pointsPerHour: number | null
}

interface BonusPeriod {
  id: string
  name: string | null
  periodStart: string
  periodEnd: string
  pointValueEur: number
  monthlyPersonalTarget: number | null
  monthlyTeamTarget: number | null
  teamBonusAmount: number | null
  isActive: boolean
  notes: string | null
}

interface Overview {
  period: BonusPeriod | null
  teamToday: number
  teamWeek: number
  teamMonth: number
  teamPeriodPoints: number
  teamTarget: number | null
  teamTargetProgress: number | null
  teamBonusAmount: number | null
  estimatedTeamBonusTotal: number
  leaderboard: LeaderboardEntry[]
}

interface StaffMultiplier {
  id: string
  staffUserId: string
  staffName: string | null
  periodStart: string
  periodEnd: string
  multiplier: number
  note: string | null
}

interface ManagerProps {
  currentUser: { id: string; name: string; email: string }
  canWrite: boolean
  canWriteNegative: boolean
  canManageRules: boolean
  canManageSettings: boolean
}

// ---------------------------------------------------------------------------
// Helpers / shared UI
// ---------------------------------------------------------------------------

const PANEL = "rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a]"
const fmt = (n: number) => new Intl.NumberFormat("sk-SK", { maximumFractionDigits: 1 }).format(n)
const fmtEur = (n: number) =>
  new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n)
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("sk-SK", { day: "2-digit", month: "2-digit", year: "numeric" })

type TabKey = "overview" | "rules" | "events" | "bonuses"

function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#28170F]">
      <div className="h-full rounded-full bg-[#E09E14] transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string
  value: string
  hint?: string
  icon: React.ReactNode
}) {
  return (
    <div className={`${PANEL} p-4`}>
      <div className="flex items-center gap-2 text-[#8C6F4E]">
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 font-heading text-2xl text-[#F5E3C2]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#8C6F4E]">{hint}</p> : null}
    </div>
  )
}

const inputCls =
  "border-[#8C6F4E]/40 bg-[#28170F] text-[#F5E3C2] placeholder:text-[#8C6F4E]/60 focus-visible:ring-[#E09E14]"

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MotivationManager({
  currentUser,
  canWrite,
  canWriteNegative,
  canManageRules,
  canManageSettings,
}: ManagerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [tab, setTab] = useState<TabKey>("overview")

  const [overview, setOverview] = useState<Overview | null>(null)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [rules, setRules] = useState<PointRule[]>([])
  const [events, setEvents] = useState<PointEvent[]>([])
  const [periods, setPeriods] = useState<BonusPeriod[]>([])
  const [multipliers, setMultipliers] = useState<StaffMultiplier[]>([])
  const [loading, setLoading] = useState(true)

  // event filters
  const [filterStaff, setFilterStaff] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")

  const loadCore = useCallback(async () => {
    setLoading(true)
    try {
      const [ovRes, staffRes] = await Promise.all([
        fetch("/api/admin/motivation/overview"),
        fetch("/api/admin/motivation/staff"),
      ])
      if (ovRes.ok) setOverview((await ovRes.json()).overview)
      if (staffRes.ok) setStaff((await staffRes.json()).staff)
    } catch {
      toast({ title: "Chyba", description: "Nepodarilo sa načítať prehľad.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const loadRules = useCallback(async () => {
    const res = await fetch("/api/admin/motivation/rules?includeInactive=true")
    if (res.ok) setRules((await res.json()).rules)
  }, [])

  const loadEvents = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterStaff !== "all") params.set("staffUserId", filterStaff)
    if (filterCategory !== "all") params.set("category", filterCategory)
    const res = await fetch(`/api/admin/motivation/events?${params.toString()}`)
    if (res.ok) setEvents((await res.json()).events)
  }, [filterStaff, filterCategory])

  const loadPeriods = useCallback(async () => {
    const res = await fetch("/api/admin/motivation/periods")
    if (res.ok) setPeriods((await res.json()).periods)
  }, [])

  const loadMultipliers = useCallback(
    async (period: BonusPeriod | null) => {
      if (!period) {
        setMultipliers([])
        return
      }
      const res = await fetch(
        `/api/admin/motivation/multipliers?periodStart=${period.periodStart}&periodEnd=${period.periodEnd}`,
      )
      if (res.ok) setMultipliers((await res.json()).multipliers)
    },
    [],
  )

  useEffect(() => {
    void loadCore()
  }, [loadCore])

  useEffect(() => {
    if (tab === "rules") void loadRules()
    if (tab === "events") void loadEvents()
    if (tab === "bonuses") {
      void loadPeriods()
      void loadRules()
    }
  }, [tab, loadRules, loadEvents, loadPeriods])

  useEffect(() => {
    if (tab === "events") void loadEvents()
  }, [filterStaff, filterCategory, tab, loadEvents])

  useEffect(() => {
    if (tab === "bonuses" && overview?.period) void loadMultipliers(overview.period)
  }, [tab, overview?.period, loadMultipliers])

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin/login")
    router.refresh()
  }

  const refreshAll = () => {
    void loadCore()
    if (tab === "rules") void loadRules()
    if (tab === "events") void loadEvents()
    if (tab === "bonuses") {
      void loadPeriods()
      if (overview?.period) void loadMultipliers(overview.period)
    }
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Prehľad", icon: <Trophy className="h-4 w-4" /> },
    { key: "events", label: "Záznamy", icon: <ClipboardList className="h-4 w-4" /> },
    { key: "rules", label: "Pravidlá", icon: <ListChecks className="h-4 w-4" /> },
    { key: "bonuses", label: "Bonusy", icon: <Settings2 className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-[#28170F]">
      <header className="border-b border-[#8C6F4E]/30 bg-[#3a251a] px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Golden Lama Coffee" width={40} height={40} className="rounded-full" />
            <div>
              <h1 className="font-heading text-xl leading-tight text-[#F5E3C2]">Motivácia tímu</h1>
              <p className="text-xs text-[#8C6F4E]">Golden Points · {currentUser.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="/admin" className="flex items-center gap-1 text-sm text-[#8C6F4E] hover:text-[#E09E14]">
              <ArrowLeft className="h-4 w-4" />
              Späť
            </a>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Odhlásiť
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Tab nav */}
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                tab === t.key
                  ? "border-[#E09E14] bg-[#E09E14]/15 text-[#F5E3C2]"
                  : "border-[#8C6F4E]/30 text-[#8C6F4E] hover:border-[#8C6F4E]/60 hover:text-[#F5E3C2]"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {loading && !overview ? (
          <div className="flex items-center justify-center py-20 text-[#8C6F4E]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Načítavam…
          </div>
        ) : (
          <>
            {tab === "overview" && <OverviewTab overview={overview} />}
            {tab === "events" && (
              <EventsTab
                events={events}
                staff={staff}
                rules={rules.filter((r) => r.isActive)}
                canWrite={canWrite}
                canWriteNegative={canWriteNegative}
                filterStaff={filterStaff}
                filterCategory={filterCategory}
                setFilterStaff={setFilterStaff}
                setFilterCategory={setFilterCategory}
                onChanged={() => {
                  void loadEvents()
                  void loadCore()
                }}
                ensureRules={loadRules}
              />
            )}
            {tab === "rules" && (
              <RulesTab rules={rules} canManageRules={canManageRules} onChanged={loadRules} />
            )}
            {tab === "bonuses" && (
              <BonusesTab
                periods={periods}
                activePeriod={overview?.period ?? null}
                staff={staff}
                multipliers={multipliers}
                canManageSettings={canManageSettings}
                onChanged={refreshAll}
                reloadMultipliers={() => loadMultipliers(overview?.period ?? null)}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function OverviewTab({ overview }: { overview: Overview | null }) {
  if (!overview) return null
  const { period, leaderboard } = overview
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-[#E09E14]/40 bg-[#E09E14]/10 px-5 py-4">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#E09E14]" />
        <div>
          <h2 className="font-heading text-lg text-[#F5E3C2]">Káva je až druhý produkt</h2>
          <p className="text-sm text-pretty text-[#8C6F4E]">
            Prvým sú úsmevy a lepšie dni ľudí. Golden Points oceňujú predaj aj výnimočný zážitok, ktorý tím vytvára.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Tím dnes" value={fmt(overview.teamToday)} icon={<Sparkles className="h-4 w-4" />} />
        <StatCard label="Tento týždeň" value={fmt(overview.teamWeek)} icon={<Sparkles className="h-4 w-4" />} />
        <StatCard label="Tento mesiac" value={fmt(overview.teamMonth)} icon={<Trophy className="h-4 w-4" />} />
        <StatCard
          label="Odhad tímového bonusu"
          value={fmtEur(overview.estimatedTeamBonusTotal)}
          hint={period ? `Hodnota bodu ${fmtEur(period.pointValueEur)}` : "Bez aktívneho obdobia"}
          icon={<Euro className="h-4 w-4" />}
        />
      </div>

      {overview.teamTarget && overview.teamTargetProgress !== null ? (
        <div className={`${PANEL} p-5`}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-[#F5E3C2]">
              <Target className="h-4 w-4 text-[#E09E14]" /> Tímový cieľ obdobia
            </span>
            <span className="text-[#8C6F4E]">
              {fmt(overview.teamPeriodPoints)} / {fmt(overview.teamTarget)} bodov
            </span>
          </div>
          <ProgressBar value={overview.teamTargetProgress} />
          <p className="mt-2 text-xs text-[#8C6F4E]">
            {overview.teamTargetProgress >= 100
              ? "Cieľ splnený — skvelá práca celého tímu!"
              : `Splnené na ${fmt(overview.teamTargetProgress)} %`}
          </p>
        </div>
      ) : null}

      <div className={`${PANEL} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-[#8C6F4E]/30 px-5 py-3">
          <h3 className="font-heading text-lg text-[#F5E3C2]">Rebríček obdobia</h3>
          {period ? (
            <span className="text-xs text-[#8C6F4E]">
              {fmtDate(period.periodStart)} – {fmtDate(period.periodEnd)}
            </span>
          ) : null}
        </div>
        {leaderboard.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#8C6F4E]">Zatiaľ žiadne body v tomto období.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[#8C6F4E]/20 text-left text-xs uppercase tracking-wide text-[#8C6F4E]">
                  <th className="px-5 py-3">#</th>
                  <th className="py-3">Zamestnanec</th>
                  <th className="py-3 text-right">Predaj</th>
                  <th className="py-3 text-right">Experience</th>
                  <th className="py-3 text-right">Tím</th>
                  <th className="py-3 text-right">Násobiteľ</th>
                  <th className="py-3 text-right">Body</th>
                  <th className="py-3 text-right">Body/h</th>
                  <th className="px-5 py-3 text-right">Odhad bonusu</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((e, i) => (
                  <tr key={e.staffUserId} className="border-b border-[#8C6F4E]/10">
                    <td className="px-5 py-3 text-[#8C6F4E]">
                      {i === 0 ? <Trophy className="h-4 w-4 text-[#E09E14]" /> : i + 1}
                    </td>
                    <td className="py-3">
                      <p className="text-[#F5E3C2]">{e.staffName}</p>
                      <p className="text-xs text-[#8C6F4E]">{e.role}</p>
                    </td>
                    <td className="py-3 text-right text-[#F5E3C2]">{fmt(e.breakdown.sales)}</td>
                    <td className="py-3 text-right text-[#F5E3C2]">{fmt(e.breakdown.experience)}</td>
                    <td className="py-3 text-right text-[#F5E3C2]">{fmt(e.breakdown.team)}</td>
                    <td className="py-3 text-right text-[#8C6F4E]">×{fmt(e.multiplier)}</td>
                    <td className="py-3 text-right font-heading text-[#E09E14]">{fmt(e.finalPoints)}</td>
                    <td className="py-3 text-right text-[#8C6F4E]">
                      {e.pointsPerHour !== null ? fmt(e.pointsPerHour) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-[#F5E3C2]">{fmtEur(e.estimatedBonus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Events tab (record points + history)
// ---------------------------------------------------------------------------

function EventsTab({
  events,
  staff,
  rules,
  canWrite,
  canWriteNegative,
  filterStaff,
  filterCategory,
  setFilterStaff,
  setFilterCategory,
  onChanged,
}: {
  events: PointEvent[]
  staff: StaffMember[]
  rules: PointRule[]
  canWrite: boolean
  canWriteNegative: boolean
  filterStaff: string
  filterCategory: string
  setFilterStaff: (v: string) => void
  setFilterCategory: (v: string) => void
  onChanged: () => void
  ensureRules: () => Promise<void>
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterStaff} onValueChange={setFilterStaff}>
            <SelectTrigger className={`h-9 w-48 ${inputCls}`}>
              <SelectValue placeholder="Zamestnanec" />
            </SelectTrigger>
            <SelectContent className="border-[#8C6F4E]/40 bg-[#3a251a] text-[#F5E3C2]">
              <SelectItem value="all">Všetci zamestnanci</SelectItem>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className={`h-9 w-48 ${inputCls}`}>
              <SelectValue placeholder="Kategória" />
            </SelectTrigger>
            <SelectContent className="border-[#8C6F4E]/40 bg-[#3a251a] text-[#F5E3C2]">
              <SelectItem value="all">Všetky kategórie</SelectItem>
              {CATEGORY_OPTIONS.map(([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canWrite ? (
          <Button
            onClick={() => setOpen(true)}
            className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Pridať body
          </Button>
        ) : null}
      </div>

      <div className={`${PANEL} overflow-hidden`}>
        {events.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#8C6F4E]">Žiadne záznamy.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-[#8C6F4E]/20 text-left text-xs uppercase tracking-wide text-[#8C6F4E]">
                  <th className="px-5 py-3">Dátum</th>
                  <th className="py-3">Zamestnanec</th>
                  <th className="py-3">Kategória</th>
                  <th className="py-3">Detail</th>
                  <th className="py-3 text-right">Množ.</th>
                  <th className="py-3 text-right">Body</th>
                  <th className="py-3">Stav</th>
                  <th className="px-5 py-3 text-right">Akcia</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-[#8C6F4E]/10 align-top">
                    <td className="px-5 py-3 text-[#8C6F4E]">{fmtDate(e.happenedAt)}</td>
                    <td className="py-3 text-[#F5E3C2]">{e.staffName}</td>
                    <td className="py-3">
                      <Badge
                        variant="outline"
                        className="border-[#8C6F4E]/40 text-[#F5E3C2]"
                      >
                        {CATEGORY_LABELS[e.category]}
                      </Badge>
                    </td>
                    <td className="py-3 text-[#8C6F4E]">
                      {e.ruleName || e.productName || "—"}
                      {e.note ? <p className="text-xs italic text-[#8C6F4E]/80">{e.note}</p> : null}
                    </td>
                    <td className="py-3 text-right text-[#8C6F4E]">{fmt(e.quantity)}</td>
                    <td
                      className={`py-3 text-right font-heading ${
                        e.totalPoints < 0 ? "text-[#e08a8a]" : "text-[#E09E14]"
                      }`}
                    >
                      {e.totalPoints > 0 ? "+" : ""}
                      {fmt(e.totalPoints)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-xs ${
                          e.status === "active" ? "text-[#9fbf8f]" : "text-[#8C6F4E] line-through"
                        }`}
                      >
                        {e.status === "active" ? "Aktívny" : e.status === "reversed" ? "Zrušený" : "Stornovaný"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {canWriteNegative && e.status === "active" ? (
                        <ReverseButton eventId={e.id} onDone={onChanged} />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open ? (
        <AddPointsDialog
          staff={staff}
          rules={rules}
          canWriteNegative={canWriteNegative}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            onChanged()
            toast({ title: "Hotovo", description: "Body boli pridané." })
          }}
        />
      ) : null}
    </div>
  )
}

function ReverseButton({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (note.trim().length === 0) {
      toast({ title: "Poznámka je povinná", variant: "destructive" })
      return
    }
    setBusy(true)
    const res = await fetch(`/api/admin/motivation/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "reversed", note }),
    })
    setBusy(false)
    if (res.ok) {
      setOpen(false)
      onDone()
      toast({ title: "Záznam zrušený" })
    } else {
      const j = await res.json().catch(() => ({}))
      toast({ title: "Chyba", description: j.error ?? "Nepodarilo sa zrušiť.", variant: "destructive" })
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 text-[#e08a8a] hover:bg-[#7a2e2e]/30 hover:text-[#F5E3C2]"
      >
        <Ban className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-[#8C6F4E]/40 bg-[#3a251a] text-[#F5E3C2]">
          <DialogHeader>
            <DialogTitle className="font-heading">Zrušiť záznam</DialogTitle>
            <DialogDescription className="text-[#8C6F4E]">
              Záznam zostane v histórii so stavom „zrušený“. Uveďte dôvod.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
            placeholder="Dôvod zrušenia"
            className={inputCls}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="border-[#8C6F4E]/50 text-[#F5E3C2]">
              Späť
            </Button>
            <Button onClick={submit} disabled={busy} className="bg-[#7a2e2e] text-[#F5E3C2] hover:bg-[#7a2e2e]/80">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Zrušiť záznam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function AddPointsDialog({
  staff,
  rules,
  canWriteNegative,
  onClose,
  onSaved,
}: {
  staff: StaffMember[]
  rules: PointRule[]
  canWriteNegative: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [mode, setMode] = useState<"rule" | "manual">("rule")
  const [staffUserId, setStaffUserId] = useState("")
  const [ruleId, setRuleId] = useState("")
  const [category, setCategory] = useState<PointCategory>("customer_smile")
  const [productName, setProductName] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [pointsPerUnit, setPointsPerUnit] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  const selectedRule = rules.find((r) => r.id === ruleId) ?? null

  // Effective values for preview
  const effCategory = mode === "rule" && selectedRule ? selectedRule.category : category
  const effPoints =
    mode === "rule" && selectedRule ? selectedRule.pointsPerUnit : Number(pointsPerUnit || "0")
  const qty = Number(quantity || "0")
  const preview = Math.round(qty * effPoints * 100) / 100
  const noteRequired =
    ["customer_smile", "team_help", "event_energy", "correction"].includes(effCategory) || preview < 0

  const submit = async () => {
    if (!staffUserId) {
      toast({ title: "Vyberte zamestnanca", variant: "destructive" })
      return
    }
    if (mode === "rule" && !ruleId) {
      toast({ title: "Vyberte pravidlo", variant: "destructive" })
      return
    }
    setBusy(true)
    const payload =
      mode === "rule"
        ? { staffUserId, ruleId, quantity: qty, note: note || null, source: "manual" }
        : {
            staffUserId,
            category,
            productName: productName || null,
            quantity: qty,
            pointsPerUnit: Number(pointsPerUnit || "0"),
            note: note || null,
            source: "manual",
          }
    const res = await fetch("/api/admin/motivation/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setBusy(false)
    if (res.ok) {
      onSaved()
    } else {
      const j = await res.json().catch(() => ({}))
      toast({ title: "Chyba", description: j.error ?? "Nepodarilo sa uložiť.", variant: "destructive" })
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#8C6F4E]/40 bg-[#3a251a] text-[#F5E3C2]">
        <DialogHeader>
          <DialogTitle className="font-heading">Pridať body</DialogTitle>
          <DialogDescription className="text-[#8C6F4E]">
            Oceňte predaj alebo výnimočný zážitok, ktorý zamestnanec vytvoril.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("rule")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                mode === "rule"
                  ? "border-[#E09E14] bg-[#E09E14]/15 text-[#F5E3C2]"
                  : "border-[#8C6F4E]/30 text-[#8C6F4E]"
              }`}
            >
              Podľa pravidla
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                mode === "manual"
                  ? "border-[#E09E14] bg-[#E09E14]/15 text-[#F5E3C2]"
                  : "border-[#8C6F4E]/30 text-[#8C6F4E]"
              }`}
            >
              Manuálne
            </button>
          </div>

          <div>
            <Label className="text-[#F5E3C2]">Zamestnanec</Label>
            <Select value={staffUserId} onValueChange={setStaffUserId}>
              <SelectTrigger className={`mt-1 ${inputCls}`}>
                <SelectValue placeholder="Vyberte zamestnanca" />
              </SelectTrigger>
              <SelectContent className="border-[#8C6F4E]/40 bg-[#3a251a] text-[#F5E3C2]">
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "rule" ? (
            <div>
              <Label className="text-[#F5E3C2]">Pravidlo</Label>
              <Select value={ruleId} onValueChange={setRuleId}>
                <SelectTrigger className={`mt-1 ${inputCls}`}>
                  <SelectValue placeholder="Vyberte pravidlo" />
                </SelectTrigger>
                <SelectContent className="border-[#8C6F4E]/40 bg-[#3a251a] text-[#F5E3C2]">
                  {rules.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({fmt(r.pointsPerUnit)} b · {CATEGORY_LABELS[r.category]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div>
                <Label className="text-[#F5E3C2]">Kategória</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as PointCategory)}>
                  <SelectTrigger className={`mt-1 ${inputCls}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#8C6F4E]/40 bg-[#3a251a] text-[#F5E3C2]">
                    {CATEGORY_OPTIONS.filter(([v]) => canWriteNegative || v !== "correction").map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[#F5E3C2]">Produkt / popis (voliteľné)</Label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className={`mt-1 ${inputCls}`}
                  placeholder="napr. Cappuccino"
                />
              </div>
              <div>
                <Label className="text-[#F5E3C2]">Body za jednotku</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={pointsPerUnit}
                  onChange={(e) => setPointsPerUnit(e.target.value)}
                  className={`mt-1 ${inputCls}`}
                  placeholder={canWriteNegative ? "Záporné = korekcia" : "napr. 5"}
                />
              </div>
            </>
          )}

          <div>
            <Label className="text-[#F5E3C2]">Množstvo</Label>
            <Input
              type="number"
              step="0.5"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={`mt-1 ${inputCls}`}
            />
          </div>

          <div>
            <Label className="text-[#F5E3C2]">
              Poznámka {noteRequired ? <span className="text-[#E09E14]">*</span> : "(voliteľné)"}
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`mt-1 ${inputCls}`}
              placeholder="Čo sa stalo? Príbeh za bodmi."
            />
          </div>

          <div className="rounded-lg border border-[#E09E14]/40 bg-[#E09E14]/10 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[#8C6F4E]">Náhľad</p>
            <p
              className={`font-heading text-xl ${preview < 0 ? "text-[#e08a8a]" : "text-[#E09E14]"}`}
            >
              {preview > 0 ? "+" : ""}
              {fmt(preview)} bodov
            </p>
            <p className="text-xs text-[#8C6F4E]">{CATEGORY_LABELS[effCategory]}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-[#8C6F4E]/50 text-[#F5E3C2]">
            Zrušiť
          </Button>
          <Button onClick={submit} disabled={busy} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Uložiť body"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Rules tab
// ---------------------------------------------------------------------------

function RulesTab({
  rules,
  canManageRules,
  onChanged,
}: {
  rules: PointRule[]
  canManageRules: boolean
  onChanged: () => Promise<void>
}) {
  const [editing, setEditing] = useState<PointRule | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#8C6F4E]">Pravidlá určujú, koľko bodov sa udelí za predaj alebo zážitok.</p>
        {canManageRules ? (
          <Button onClick={() => setCreating(true)} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90">
            <Plus className="mr-2 h-4 w-4" />
            Nové pravidlo
          </Button>
        ) : null}
      </div>

      <div className={`${PANEL} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-[#8C6F4E]/20 text-left text-xs uppercase tracking-wide text-[#8C6F4E]">
                <th className="px-5 py-3">Názov</th>
                <th className="py-3">Kategória</th>
                <th className="py-3 text-right">Body/jedn.</th>
                <th className="py-3 text-right">Bonus</th>
                <th className="py-3">Stav</th>
                {canManageRules ? <th className="px-5 py-3 text-right">Akcia</th> : null}
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b border-[#8C6F4E]/10">
                  <td className="px-5 py-3 text-[#F5E3C2]">
                    {r.name}
                    {r.productName ? <p className="text-xs text-[#8C6F4E]">{r.productName}</p> : null}
                  </td>
                  <td className="py-3 text-[#8C6F4E]">{CATEGORY_LABELS[r.category]}</td>
                  <td className="py-3 text-right text-[#F5E3C2]">{fmt(r.pointsPerUnit)}</td>
                  <td className="py-3 text-right text-[#8C6F4E]">{r.bonusPoints !== null ? fmt(r.bonusPoints) : "—"}</td>
                  <td className="py-3">
                    <span className={`text-xs ${r.isActive ? "text-[#9fbf8f]" : "text-[#8C6F4E]"}`}>
                      {r.isActive ? "Aktívne" : "Neaktívne"}
                    </span>
                  </td>
                  {canManageRules ? (
                    <td className="px-5 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(r)}
                        className="h-8 text-[#8C6F4E] hover:text-[#E09E14]"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(creating || editing) && canManageRules ? (
        <RuleDialog
          rule={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={async () => {
            setCreating(false)
            setEditing(null)
            await onChanged()
          }}
        />
      ) : null}
    </div>
  )
}

function RuleDialog({
  rule,
  onClose,
  onSaved,
}: {
  rule: PointRule | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { toast } = useToast()
  const [name, setName] = useState(rule?.name ?? "")
  const [category, setCategory] = useState<PointCategory>(rule?.category ?? "sales")
  const [productName, setProductName] = useState(rule?.productName ?? "")
  const [pointsPerUnit, setPointsPerUnit] = useState(String(rule?.pointsPerUnit ?? "1"))
  const [bonusPoints, setBonusPoints] = useState(rule?.bonusPoints !== null && rule?.bonusPoints !== undefined ? String(rule.bonusPoints) : "")
  const [isActive, setIsActive] = useState(rule?.isActive ?? true)
  const [notes, setNotes] = useState(rule?.notes ?? "")
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (name.trim().length === 0) {
      toast({ title: "Zadajte názov", variant: "destructive" })
      return
    }
    setBusy(true)
    const payload = {
      name,
      category,
      productName: productName || null,
      pointsPerUnit: Number(pointsPerUnit || "0"),
      bonusPoints: bonusPoints === "" ? null : Number(bonusPoints),
      isActive,
      notes: notes || null,
    }
    const res = await fetch(
      rule ? `/api/admin/motivation/rules/${rule.id}` : "/api/admin/motivation/rules",
      {
        method: rule ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    )
    setBusy(false)
    if (res.ok) {
      await onSaved()
      toast({ title: "Uložené", description: "Pravidlo bolo uložené." })
    } else {
      const j = await res.json().catch(() => ({}))
      toast({ title: "Chyba", description: j.error ?? "Nepodarilo sa uložiť.", variant: "destructive" })
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#8C6F4E]/40 bg-[#3a251a] text-[#F5E3C2]">
        <DialogHeader>
          <DialogTitle className="font-heading">{rule ? "Upraviť pravidlo" : "Nové pravidlo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-[#F5E3C2]">Názov</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className={`mt-1 ${inputCls}`} />
          </div>
          <div>
            <Label className="text-[#F5E3C2]">Kategória</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as PointCategory)}>
              <SelectTrigger className={`mt-1 ${inputCls}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[#8C6F4E]/40 bg-[#3a251a] text-[#F5E3C2]">
                {CATEGORY_OPTIONS.map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[#F5E3C2]">Produkt (voliteľné)</Label>
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} className={`mt-1 ${inputCls}`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#F5E3C2]">Body za jednotku</Label>
              <Input
                type="number"
                step="0.1"
                value={pointsPerUnit}
                onChange={(e) => setPointsPerUnit(e.target.value)}
                className={`mt-1 ${inputCls}`}
              />
            </div>
            <div>
              <Label className="text-[#F5E3C2]">Bonus (voliteľné)</Label>
              <Input
                type="number"
                step="0.1"
                value={bonusPoints}
                onChange={(e) => setBonusPoints(e.target.value)}
                className={`mt-1 ${inputCls}`}
              />
            </div>
          </div>
          <div>
            <Label className="text-[#F5E3C2]">Poznámka</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`mt-1 ${inputCls}`} />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#F5E3C2]">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 accent-[#E09E14]"
            />
            Aktívne pravidlo
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-[#8C6F4E]/50 text-[#F5E3C2]">
            Zrušiť
          </Button>
          <Button onClick={submit} disabled={busy} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Uložiť"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Bonuses tab (periods + multipliers)
// ---------------------------------------------------------------------------

function BonusesTab({
  periods,
  activePeriod,
  staff,
  multipliers,
  canManageSettings,
  onChanged,
  reloadMultipliers,
}: {
  periods: BonusPeriod[]
  activePeriod: BonusPeriod | null
  staff: StaffMember[]
  multipliers: StaffMultiplier[]
  canManageSettings: boolean
  onChanged: () => void
  reloadMultipliers: () => Promise<void>
}) {
  const { toast } = useToast()
  const [editing, setEditing] = useState<BonusPeriod | null>(null)
  const [creating, setCreating] = useState(false)

  const multMap = useMemo(() => new Map(multipliers.map((m) => [m.staffUserId, m])), [multipliers])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#8C6F4E]">Obdobia určujú hodnotu bodu, ciele a tímový bonus.</p>
        {canManageSettings ? (
          <Button onClick={() => setCreating(true)} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90">
            <Plus className="mr-2 h-4 w-4" />
            Nové obdobie
          </Button>
        ) : null}
      </div>

      <div className={`${PANEL} overflow-hidden`}>
        <div className="border-b border-[#8C6F4E]/30 px-5 py-3">
          <h3 className="font-heading text-lg text-[#F5E3C2]">Obdobia</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[#8C6F4E]/20 text-left text-xs uppercase tracking-wide text-[#8C6F4E]">
                <th className="px-5 py-3">Obdobie</th>
                <th className="py-3 text-right">Hodnota bodu</th>
                <th className="py-3 text-right">Osobný cieľ</th>
                <th className="py-3 text-right">Tímový cieľ</th>
                <th className="py-3 text-right">Tímový bonus</th>
                <th className="py-3">Stav</th>
                {canManageSettings ? <th className="px-5 py-3 text-right">Akcia</th> : null}
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id} className="border-b border-[#8C6F4E]/10">
                  <td className="px-5 py-3 text-[#F5E3C2]">
                    {p.name || `${fmtDate(p.periodStart)} – ${fmtDate(p.periodEnd)}`}
                    <p className="text-xs text-[#8C6F4E]">
                      {fmtDate(p.periodStart)} – {fmtDate(p.periodEnd)}
                    </p>
                  </td>
                  <td className="py-3 text-right text-[#F5E3C2]">{fmtEur(p.pointValueEur)}</td>
                  <td className="py-3 text-right text-[#8C6F4E]">
                    {p.monthlyPersonalTarget !== null ? fmt(p.monthlyPersonalTarget) : "—"}
                  </td>
                  <td className="py-3 text-right text-[#8C6F4E]">
                    {p.monthlyTeamTarget !== null ? fmt(p.monthlyTeamTarget) : "—"}
                  </td>
                  <td className="py-3 text-right text-[#8C6F4E]">
                    {p.teamBonusAmount !== null ? fmtEur(p.teamBonusAmount) : "—"}
                  </td>
                  <td className="py-3">
                    <span className={`text-xs ${p.isActive ? "text-[#9fbf8f]" : "text-[#8C6F4E]"}`}>
                      {p.isActive ? "Aktívne" : "Neaktívne"}
                    </span>
                  </td>
                  {canManageSettings ? (
                    <td className="px-5 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(p)}
                        className="h-8 text-[#8C6F4E] hover:text-[#E09E14]"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quality multipliers for active period */}
      <div className={`${PANEL} overflow-hidden`}>
        <div className="border-b border-[#8C6F4E]/30 px-5 py-3">
          <h3 className="font-heading text-lg text-[#F5E3C2]">Kvalitatívne násobiče</h3>
          <p className="text-xs text-[#8C6F4E]">
            {activePeriod
              ? `Pre obdobie ${fmtDate(activePeriod.periodStart)} – ${fmtDate(activePeriod.periodEnd)}`
              : "Žiadne aktívne obdobie"}
          </p>
        </div>
        {!activePeriod ? (
          <p className="px-5 py-6 text-center text-sm text-[#8C6F4E]">Najprv vytvorte a aktivujte obdobie.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-[#8C6F4E]/20 text-left text-xs uppercase tracking-wide text-[#8C6F4E]">
                  <th className="px-5 py-3">Zamestnanec</th>
                  <th className="py-3 text-right">Násobiteľ</th>
                  <th className="py-3">Poznámka</th>
                  {canManageSettings ? <th className="px-5 py-3 text-right">Akcia</th> : null}
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => {
                  const m = multMap.get(s.id)
                  return (
                    <tr key={s.id} className="border-b border-[#8C6F4E]/10">
                      <td className="px-5 py-3 text-[#F5E3C2]">{s.name}</td>
                      <td className="py-3 text-right text-[#E09E14]">×{fmt(m?.multiplier ?? 1)}</td>
                      <td className="py-3 text-[#8C6F4E]">{m?.note ?? "—"}</td>
                      {canManageSettings ? (
                        <td className="px-5 py-3 text-right">
                          <MultiplierButton
                            staff={s}
                            period={activePeriod}
                            current={m?.multiplier ?? 1}
                            currentNote={m?.note ?? ""}
                            onSaved={async () => {
                              await reloadMultipliers()
                              onChanged()
                              toast({ title: "Násobiteľ uložený" })
                            }}
                          />
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(creating || editing) && canManageSettings ? (
        <PeriodDialog
          period={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={() => {
            setCreating(false)
            setEditing(null)
            onChanged()
          }}
        />
      ) : null}
    </div>
  )
}

function MultiplierButton({
  staff,
  period,
  current,
  currentNote,
  onSaved,
}: {
  staff: StaffMember
  period: BonusPeriod
  current: number
  currentNote: string
  onSaved: () => Promise<void>
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(String(current))
  const [note, setNote] = useState(currentNote)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (note.trim().length === 0) {
      toast({ title: "Poznámka je povinná", variant: "destructive" })
      return
    }
    setBusy(true)
    const res = await fetch("/api/admin/motivation/multipliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staffUserId: staff.id,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        multiplier: Number(value || "1"),
        note,
      }),
    })
    setBusy(false)
    if (res.ok) {
      setOpen(false)
      await onSaved()
    } else {
      const j = await res.json().catch(() => ({}))
      toast({ title: "Chyba", description: j.error ?? "Nepodarilo sa uložiť.", variant: "destructive" })
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="h-8 text-[#8C6F4E] hover:text-[#E09E14]">
        <Pencil className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-[#8C6F4E]/40 bg-[#3a251a] text-[#F5E3C2]">
          <DialogHeader>
            <DialogTitle className="font-heading">Násobiteľ — {staff.name}</DialogTitle>
            <DialogDescription className="text-[#8C6F4E]">
              Kvalitatívny násobiteľ upraví finálne body za toto obdobie.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[#F5E3C2]">Násobiteľ</Label>
              <Input
                type="number"
                step="0.05"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={`mt-1 ${inputCls}`}
              />
            </div>
            <div>
              <Label className="text-[#F5E3C2]">
                Poznámka <span className="text-[#E09E14]">*</span>
              </Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} className={`mt-1 ${inputCls}`} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="border-[#8C6F4E]/50 text-[#F5E3C2]">
              Zrušiť
            </Button>
            <Button onClick={submit} disabled={busy} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Uložiť"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function PeriodDialog({
  period,
  onClose,
  onSaved,
}: {
  period: BonusPeriod | null
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [name, setName] = useState(period?.name ?? "")
  const [periodStart, setPeriodStart] = useState(period?.periodStart ?? "")
  const [periodEnd, setPeriodEnd] = useState(period?.periodEnd ?? "")
  const [pointValueEur, setPointValueEur] = useState(String(period?.pointValueEur ?? "0.05"))
  const [personalTarget, setPersonalTarget] = useState(
    period?.monthlyPersonalTarget !== null && period?.monthlyPersonalTarget !== undefined
      ? String(period.monthlyPersonalTarget)
      : "",
  )
  const [teamTarget, setTeamTarget] = useState(
    period?.monthlyTeamTarget !== null && period?.monthlyTeamTarget !== undefined ? String(period.monthlyTeamTarget) : "",
  )
  const [teamBonus, setTeamBonus] = useState(
    period?.teamBonusAmount !== null && period?.teamBonusAmount !== undefined ? String(period.teamBonusAmount) : "",
  )
  const [isActive, setIsActive] = useState(period?.isActive ?? true)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!periodStart || !periodEnd) {
      toast({ title: "Zadajte obdobie", variant: "destructive" })
      return
    }
    setBusy(true)
    const payload = {
      name: name || null,
      periodStart,
      periodEnd,
      pointValueEur: Number(pointValueEur || "0"),
      monthlyPersonalTarget: personalTarget === "" ? null : Number(personalTarget),
      monthlyTeamTarget: teamTarget === "" ? null : Number(teamTarget),
      teamBonusAmount: teamBonus === "" ? null : Number(teamBonus),
      isActive,
    }
    const res = await fetch(
      period ? `/api/admin/motivation/periods/${period.id}` : "/api/admin/motivation/periods",
      {
        method: period ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    )
    setBusy(false)
    if (res.ok) {
      onSaved()
      toast({ title: "Uložené", description: "Obdobie bolo uložené." })
    } else {
      const j = await res.json().catch(() => ({}))
      toast({ title: "Chyba", description: j.error ?? "Nepodarilo sa uložiť.", variant: "destructive" })
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#8C6F4E]/40 bg-[#3a251a] text-[#F5E3C2]">
        <DialogHeader>
          <DialogTitle className="font-heading">{period ? "Upraviť obdobie" : "Nové obdobie"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-[#F5E3C2]">Názov (voliteľné)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className={`mt-1 ${inputCls}`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#F5E3C2]">Od</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className={`mt-1 ${inputCls}`}
              />
            </div>
            <div>
              <Label className="text-[#F5E3C2]">Do</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className={`mt-1 ${inputCls}`}
              />
            </div>
          </div>
          <div>
            <Label className="text-[#F5E3C2]">Hodnota bodu (EUR)</Label>
            <Input
              type="number"
              step="0.001"
              value={pointValueEur}
              onChange={(e) => setPointValueEur(e.target.value)}
              className={`mt-1 ${inputCls}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#F5E3C2]">Osobný cieľ (body)</Label>
              <Input
                type="number"
                value={personalTarget}
                onChange={(e) => setPersonalTarget(e.target.value)}
                className={`mt-1 ${inputCls}`}
              />
            </div>
            <div>
              <Label className="text-[#F5E3C2]">Tímový cieľ (body)</Label>
              <Input
                type="number"
                value={teamTarget}
                onChange={(e) => setTeamTarget(e.target.value)}
                className={`mt-1 ${inputCls}`}
              />
            </div>
          </div>
          <div>
            <Label className="text-[#F5E3C2]">Tímový bonus (EUR)</Label>
            <Input
              type="number"
              step="0.01"
              value={teamBonus}
              onChange={(e) => setTeamBonus(e.target.value)}
              className={`mt-1 ${inputCls}`}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#F5E3C2]">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 accent-[#E09E14]"
            />
            Aktívne obdobie
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-[#8C6F4E]/50 text-[#F5E3C2]">
            Zrušiť
          </Button>
          <Button onClick={submit} disabled={busy} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Uložiť"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
