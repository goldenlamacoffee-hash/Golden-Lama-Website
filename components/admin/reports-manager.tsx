"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Loader2,
  CalendarClock,
  CalendarOff,
  Sparkles,
  Package,
  Users,
  AlertCircle,
} from "lucide-react"

type ReportType = "shifts" | "absences" | "points" | "inventory" | "users"

interface StaffOption {
  id: string
  name: string
  email: string
}
interface ItemOption {
  id: string
  name: string
  itemCode: string | null
}

interface ReportsManagerProps {
  currentUser: { id: string; name: string; email: string }
  access: Record<ReportType, boolean>
}

const ALL = "__all__"

/** Current month [first, last] day as YYYY-MM-DD (UTC). */
function currentMonthRange(): { from: string; to: string } {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const pad = (n: number) => String(n).padStart(2, "0")
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(lastDay)}` }
}

interface CardMeta {
  type: ReportType
  title: string
  subtitle: string
  icon: typeof CalendarClock
}

const CARDS: CardMeta[] = [
  { type: "shifts", title: "Zmeny a hodiny", subtitle: "Odpracované hodiny pre mzdy a kontrolu", icon: CalendarClock },
  { type: "absences", title: "Neprítomnosti", subtitle: "Dovolenky, PN, školenia a dostupnosť", icon: CalendarOff },
  { type: "points", title: "Zlaté body", subtitle: "Motivačné body a odhad bonusov", icon: Sparkles },
  { type: "inventory", title: "Skladové pohyby", subtitle: "Nákupy, spotreba, odpisy a presuny", icon: Package },
  { type: "users", title: "Používatelia", subtitle: "Zoznam účtov, rolí a prihlásení", icon: Users },
]

const SHIFT_STATUS = [
  { value: "draft", label: "Návrh" },
  { value: "published", label: "Publikované" },
  { value: "cancelled", label: "Zrušené" },
]
const ABSENCE_TYPES = [
  { value: "vacation", label: "Dovolenka" },
  { value: "sick_leave", label: "PN / Choroba" },
  { value: "unavailable", label: "Nedostupný" },
  { value: "training", label: "Školenie" },
  { value: "other", label: "Iné" },
]
const POINT_CATEGORIES = [
  { value: "sales", label: "Predaj" },
  { value: "customer_smile", label: "Zákaznícky úsmev" },
  { value: "team_help", label: "Tímová pomoc" },
  { value: "reliability", label: "Spoľahlivosť" },
  { value: "cleanliness_preparation", label: "Čistota & príprava" },
  { value: "event_energy", label: "Event energia" },
  { value: "bonus", label: "Bonus" },
  { value: "correction", label: "Korekcia" },
]
const POINT_SOURCES = [
  { value: "manual", label: "Manuálne" },
  { value: "pos", label: "Pokladňa" },
  { value: "adjustment", label: "Úprava" },
  { value: "team_bonus", label: "Tímový bonus" },
  { value: "correction", label: "Korekcia" },
]
const POINT_STATUS = [
  { value: "active", label: "Aktívne" },
  { value: "reversed", label: "Vrátené" },
  { value: "cancelled", label: "Zrušené" },
]
const MOVEMENT_TYPES = [
  { value: "purchase", label: "Nákup" },
  { value: "usage", label: "Spotreba" },
  { value: "adjustment", label: "Úprava" },
  { value: "waste", label: "Odpis" },
  { value: "transfer", label: "Presun" },
]

export function ReportsManager({ currentUser, access }: ReportsManagerProps) {
  const router = useRouter()
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [items, setItems] = useState<ItemOption[]>([])

  useEffect(() => {
    let active = true
    fetch("/api/admin/reports/options")
      .then((r) => (r.ok ? r.json() : { staff: [], items: [] }))
      .then((d) => {
        if (!active) return
        setStaff(d.staff ?? [])
        setItems(d.items ?? [])
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const visibleCards = useMemo(() => CARDS.filter((c) => access[c.type]), [access])

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#28170F]">
      <header className="bg-[#3a251a] border-b border-[#8C6F4E]/30 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Golden Lama Coffee" width={40} height={40} className="rounded-full" />
            <div>
              <h1 className="font-heading text-xl text-[#F5E3C2] leading-tight">Reporty / Exporty</h1>
              <p className="text-xs text-[#8C6F4E]">Dochádzka, neprítomnosti, sklad a bonusové body</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/admin" className="text-[#8C6F4E] hover:text-[#E09E14] text-sm flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Späť na admin
            </a>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
            >
              Odhlásiť
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6 rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a]/60 px-5 py-4 text-sm text-[#F5E3C2]/90">
          Exporty sú určené pre internú kontrolu, mzdy a prípadné kontroly. Vyberte obdobie a filtre, potom stiahnite
          súbor vo formáte Excel (.xlsx) alebo CSV.
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {visibleCards.map((card) => (
            <ReportCard key={card.type} meta={card} staff={staff} items={items} />
          ))}
        </div>

        {visibleCards.length === 0 && (
          <p className="text-[#8C6F4E]">Pre vašu rolu nie sú dostupné žiadne exporty.</p>
        )}
      </main>
    </div>
  )
}

function ReportCard({
  meta,
  staff,
  items,
}: {
  meta: CardMeta
  staff: StaffOption[]
  items: ItemOption[]
}) {
  const initialRange = useMemo(currentMonthRange, [])
  const [from, setFrom] = useState(initialRange.from)
  const [to, setTo] = useState(initialRange.to)
  const [staffId, setStaffId] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [absenceType, setAbsenceType] = useState(ALL)
  const [category, setCategory] = useState(ALL)
  const [source, setSource] = useState(ALL)
  const [itemId, setItemId] = useState(ALL)
  const [movementType, setMovementType] = useState(ALL)
  const [createdBy, setCreatedBy] = useState(ALL)
  const [busy, setBusy] = useState<"xlsx" | "csv" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const Icon = meta.icon
  const isUsers = meta.type === "users"
  const showDates = !isUsers

  async function download(format: "xlsx" | "csv") {
    setError(null)
    setBusy(format)
    try {
      const params = new URLSearchParams({ type: meta.type, format })
      if (showDates) {
        if (from) params.set("from", from)
        if (to) params.set("to", to)
      }
      if (staffId !== ALL) params.set("staff", staffId)
      if (status !== ALL) params.set("status", status)
      if (meta.type === "absences" && absenceType !== ALL) params.set("absenceType", absenceType)
      if (meta.type === "points") {
        if (category !== ALL) params.set("category", category)
        if (source !== ALL) params.set("source", source)
      }
      if (meta.type === "inventory") {
        if (itemId !== ALL) params.set("item", itemId)
        if (movementType !== ALL) params.set("movementType", movementType)
        if (createdBy !== ALL) params.set("createdBy", createdBy)
      }

      const res = await fetch(`/api/admin/reports/export?${params.toString()}`)
      if (!res.ok) {
        const msg = await res.json().catch(() => null)
        throw new Error(msg?.error ?? "Export sa nepodaril.")
      }
      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition") ?? ""
      const match = /filename="?([^"]+)"?/.exec(disposition)
      const filename = match?.[1] ?? `golden-lama-${meta.type}.${format}`

      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = objectUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export sa nepodaril.")
    } finally {
      setBusy(null)
    }
  }

  const staffSelect = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Všetci</SelectItem>
        {staff.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const enumSelect = (
    value: string,
    onChange: (v: string) => void,
    options: { value: string; label: string }[],
    allLabel = "Všetky",
  ) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E09E14]/15">
          <Icon className="h-5 w-5 text-[#E09E14]" />
        </div>
        <div>
          <h2 className="font-heading text-lg text-[#F5E3C2] leading-tight">{meta.title}</h2>
          <p className="text-sm text-[#8C6F4E]">{meta.subtitle}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {showDates && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-[#8C6F4E]">Dátum od</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-[#8C6F4E]">Dátum do</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
            </div>
          </>
        )}

        {(meta.type === "shifts" || meta.type === "absences" || meta.type === "points") && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-[#8C6F4E]">Zamestnanec</Label>
            {staffSelect(staffId, setStaffId, "Všetci")}
          </div>
        )}

        {meta.type === "absences" && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-[#8C6F4E]">Typ neprítomnosti</Label>
            {enumSelect(absenceType, setAbsenceType, ABSENCE_TYPES)}
          </div>
        )}

        {(meta.type === "shifts" || meta.type === "absences") && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-[#8C6F4E]">Stav</Label>
            {enumSelect(status, setStatus, SHIFT_STATUS)}
          </div>
        )}

        {meta.type === "points" && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-[#8C6F4E]">Kategória</Label>
              {enumSelect(category, setCategory, POINT_CATEGORIES)}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-[#8C6F4E]">Zdroj</Label>
              {enumSelect(source, setSource, POINT_SOURCES)}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-[#8C6F4E]">Stav</Label>
              {enumSelect(status, setStatus, POINT_STATUS)}
            </div>
          </>
        )}

        {meta.type === "inventory" && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-[#8C6F4E]">Položka</Label>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Všetky</SelectItem>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.itemCode ? `${i.itemCode} · ` : ""}
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-[#8C6F4E]">Typ pohybu</Label>
              {enumSelect(movementType, setMovementType, MOVEMENT_TYPES)}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-[#8C6F4E]">Vytvoril</Label>
              {staffSelect(createdBy, setCreatedBy, "Všetci")}
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button
          onClick={() => download("xlsx")}
          disabled={busy !== null}
          className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90"
        >
          {busy === "xlsx" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4 mr-2" />
          )}
          Export Excel
        </Button>
        <Button
          onClick={() => download("csv")}
          disabled={busy !== null}
          variant="outline"
          className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
        >
          {busy === "csv" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
          CSV
        </Button>
      </div>
    </div>
  )
}
