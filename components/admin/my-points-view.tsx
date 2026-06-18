"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  LogOut,
  Loader2,
  Sparkles,
  Coffee,
  Heart,
  Users,
  Trophy,
  Clock,
  Euro,
} from "lucide-react"

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

interface PointEvent {
  id: string
  category: PointCategory
  productName: string | null
  ruleName: string | null
  quantity: number
  totalPoints: number
  note: string | null
  happenedAt: string
  status: string
  createdByName: string | null
}

interface MyPoints {
  period: { name: string | null; periodStart: string; periodEnd: string; pointValueEur: number } | null
  today: number
  week: number
  month: number
  breakdown: { sales: number; experience: number; team: number; other: number; total: number }
  multiplier: number
  finalPoints: number
  estimatedBonus: number
  personalTarget: number | null
  personalTargetProgress: number | null
  workedHours: number
  pointsPerHour: number | null
  history: PointEvent[]
  positiveNotes: PointEvent[]
}

const PANEL = "rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a]"
const fmt = (n: number) => new Intl.NumberFormat("sk-SK", { maximumFractionDigits: 1 }).format(n)
const fmtEur = (n: number) =>
  new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n)
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("sk-SK", { day: "2-digit", month: "2-digit", year: "numeric" })

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

export function MyPointsView({ currentUser }: { currentUser: { id: string; name: string; email: string } }) {
  const router = useRouter()
  const [data, setData] = useState<MyPoints | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/motivation/my-points")
      if (!res.ok) throw new Error("Nepodarilo sa načítať body.")
      const json = await res.json()
      setData(json.myPoints as MyPoints)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba pri načítaní.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#28170F]">
      <header className="border-b border-[#8C6F4E]/30 bg-[#3a251a] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Golden Lama Coffee" width={40} height={40} className="rounded-full" />
            <div>
              <h1 className="font-heading text-xl leading-tight text-[#F5E3C2]">Zlaté body</h1>
              <p className="text-xs text-[#8C6F4E]">{currentUser.name} · Golden Points</p>
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

      <main className="mx-auto max-w-5xl px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#8C6F4E]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Načítavam tvoje body…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-[#7a2e2e] bg-[#7a2e2e]/20 px-4 py-3 text-sm text-[#F5E3C2]">
            {error}
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Motivational banner */}
            <div className="flex items-start gap-3 rounded-lg border border-[#E09E14]/40 bg-[#E09E14]/10 px-5 py-4">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#E09E14]" />
              <div>
                <h2 className="font-heading text-lg text-[#F5E3C2]">Tvoríš lepší deň</h2>
                <p className="text-sm text-pretty text-[#8C6F4E]">
                  Káva je až druhý produkt — prvým sú úsmevy a lepšie dni ľudí. Ďakujeme, že robíš Golden Lamu
                  výnimočnou.
                </p>
              </div>
            </div>

            {/* Time totals */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Dnes" value={fmt(data.today)} icon={<Sparkles className="h-4 w-4" />} />
              <StatCard label="Tento týždeň" value={fmt(data.week)} icon={<Sparkles className="h-4 w-4" />} />
              <StatCard label="Tento mesiac" value={fmt(data.month)} icon={<Trophy className="h-4 w-4" />} />
              <StatCard
                label="Body / hodina"
                value={data.pointsPerHour !== null ? fmt(data.pointsPerHour) : "—"}
                hint={data.workedHours > 0 ? `${fmt(data.workedHours)} h odpracovaných` : "Bez zmien"}
                icon={<Clock className="h-4 w-4" />}
              />
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Predaj" value={fmt(data.breakdown.sales)} icon={<Coffee className="h-4 w-4" />} />
              <StatCard
                label="Golden Experience"
                value={fmt(data.breakdown.experience)}
                hint="Úsmevy, spoľahlivosť, eventy"
                icon={<Heart className="h-4 w-4" />}
              />
              <StatCard label="Tímová energia" value={fmt(data.breakdown.team)} icon={<Users className="h-4 w-4" />} />
            </div>

            {/* Bonus estimate */}
            <div className={`${PANEL} p-5`}>
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-lg text-[#F5E3C2]">Odhad mesačného bonusu</h3>
                <Badge className="bg-[#E09E14] text-[#28170F]">Odhad</Badge>
              </div>
              <p className="mt-1 text-xs text-[#8C6F4E]">
                {data.period
                  ? `Obdobie ${fmtDate(data.period.periodStart)} – ${fmtDate(data.period.periodEnd)}`
                  : "Bonusové obdobie zatiaľ nie je nastavené"}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-[#8C6F4E]">Body spolu</p>
                  <p className="font-heading text-xl text-[#F5E3C2]">{fmt(data.breakdown.total)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8C6F4E]">Násobiteľ kvality</p>
                  <p className="font-heading text-xl text-[#F5E3C2]">×{fmt(data.multiplier)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8C6F4E]">Finálne body</p>
                  <p className="font-heading text-xl text-[#F5E3C2]">{fmt(data.finalPoints)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8C6F4E]">Odhad bonusu</p>
                  <p className="font-heading text-xl text-[#E09E14]">{fmtEur(data.estimatedBonus)}</p>
                </div>
              </div>
              {data.personalTarget && data.personalTargetProgress !== null ? (
                <div className="mt-5">
                  <div className="mb-1 flex items-center justify-between text-xs text-[#8C6F4E]">
                    <span>Osobný cieľ</span>
                    <span>
                      {fmt(data.breakdown.total)} / {fmt(data.personalTarget)} bodov (
                      {fmt(data.personalTargetProgress)} %)
                    </span>
                  </div>
                  <ProgressBar value={data.personalTargetProgress} />
                </div>
              ) : null}
              <p className="mt-4 text-xs text-pretty text-[#8C6F4E]">
                Toto je transparentný odhad, nie automatická výplata. Konečné bonusy schvaľuje majiteľ.
              </p>
            </div>

            {/* Positive notes */}
            {data.positiveNotes.length > 0 ? (
              <div className={`${PANEL} p-5`}>
                <h3 className="mb-3 flex items-center gap-2 font-heading text-lg text-[#F5E3C2]">
                  <Heart className="h-5 w-5 text-[#E09E14]" />
                  Pochvaly a poznámky
                </h3>
                <ul className="space-y-3">
                  {data.positiveNotes.map((e) => (
                    <li key={e.id} className="rounded-md border border-[#8C6F4E]/20 bg-[#28170F]/40 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="border-[#8C6F4E]/50 text-[#E09E14]">
                          {CATEGORY_LABELS[e.category]}
                        </Badge>
                        <span className="text-xs text-[#8C6F4E]">{fmtDate(e.happenedAt)}</span>
                      </div>
                      <p className="mt-2 text-sm text-pretty text-[#F5E3C2]">{e.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* History */}
            <div className={`${PANEL} p-5`}>
              <h3 className="mb-3 font-heading text-lg text-[#F5E3C2]">Moja história bodov</h3>
              {data.history.length === 0 ? (
                <p className="text-sm text-[#8C6F4E]">Zatiaľ žiadne body. Tvoj prvý úsmev sa ráta!</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-[#8C6F4E]">
                        <th className="py-2 pr-4 font-medium">Dátum</th>
                        <th className="py-2 pr-4 font-medium">Kategória</th>
                        <th className="py-2 pr-4 font-medium">Detail</th>
                        <th className="py-2 pr-4 text-right font-medium">Body</th>
                        <th className="py-2 font-medium">Stav</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.history.map((e) => (
                        <tr key={e.id} className="border-t border-[#8C6F4E]/20 text-[#F5E3C2]">
                          <td className="py-2 pr-4 whitespace-nowrap text-[#8C6F4E]">{fmtDate(e.happenedAt)}</td>
                          <td className="py-2 pr-4">{CATEGORY_LABELS[e.category]}</td>
                          <td className="py-2 pr-4 text-[#8C6F4E]">
                            {e.ruleName || e.productName || e.note || "—"}
                          </td>
                          <td
                            className={`py-2 pr-4 text-right font-medium ${
                              e.totalPoints < 0 ? "text-[#d98b8b]" : "text-[#F5E3C2]"
                            }`}
                          >
                            {e.status === "active" ? fmt(e.totalPoints) : <s>{fmt(e.totalPoints)}</s>}
                          </td>
                          <td className="py-2 text-xs text-[#8C6F4E]">
                            {e.status === "active" ? "Aktívny" : e.status === "reversed" ? "Zrušený" : "Stornovaný"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
