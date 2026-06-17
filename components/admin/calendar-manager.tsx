"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Ban,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  Clock,
  MapPin,
  CalendarRange,
  List,
  AlertTriangle,
} from "lucide-react"

export type ShiftStatus = "draft" | "published" | "cancelled"
export type EntryType = "work_shift" | "vacation" | "sick_leave" | "unavailable" | "training" | "other"

export interface ShiftDto {
  id: string
  staffUserId: string
  staffName: string
  staffEmail: string
  entryType: EntryType
  allDay: boolean
  startDate: string
  endDate: string
  startTime: string | null
  endTime: string | null
  location: string
  position: string
  notes: string
  status: ShiftStatus
}

interface OverlapDto {
  id: string
  entryType: EntryType
  startDate: string
  endDate: string
  allDay: boolean
  startTime: string | null
  endTime: string | null
}

interface StaffOption {
  id: string
  name: string
  email: string
  role: string
}

interface CalendarManagerProps {
  currentUser: { id: string; name: string; email: string }
  canWrite: boolean
  canDelete: boolean
  canReadAll: boolean
  /** Page title and whether this is the personal "my shifts" view. */
  personalView?: boolean
}

type ViewMode = "month" | "week" | "list"

const statusMeta: Record<ShiftStatus, { label: string; className: string }> = {
  draft: { label: "Koncept", className: "bg-[#4a3526] text-[#F5E3C2]" },
  published: { label: "Zverejnené", className: "bg-[#E09E14] text-[#28170F]" },
  cancelled: { label: "Zrušené", className: "bg-[#7a2e2e] text-[#F5E3C2]" },
}

/** Each entry type drives the colored block in the calendar. */
const typeMeta: Record<
  EntryType,
  { label: string; short: string; block: string; dot: string; timed: boolean }
> = {
  work_shift: { label: "Pracovná zmena", short: "Zmena", block: "bg-[#E09E14] text-[#28170F]", dot: "bg-[#E09E14]", timed: true },
  training: { label: "Školenie", short: "Školenie", block: "bg-[#2f6f7a] text-[#F5E3C2]", dot: "bg-[#2f6f7a]", timed: true },
  vacation: { label: "Dovolenka", short: "Dovolenka", block: "bg-[#3b6b4a] text-[#F5E3C2]", dot: "bg-[#3b6b4a]", timed: false },
  sick_leave: { label: "PN / Choroba", short: "PN", block: "bg-[#9a5b2e] text-[#F5E3C2]", dot: "bg-[#9a5b2e]", timed: false },
  unavailable: { label: "Nedostupný", short: "Nedostupný", block: "bg-[#5a4636] text-[#F5E3C2]", dot: "bg-[#5a4636]", timed: false },
  other: { label: "Iné", short: "Iné", block: "bg-[#4a3526] text-[#F5E3C2]", dot: "bg-[#4a3526]", timed: false },
}

const ENTRY_TYPE_ORDER: EntryType[] = ["work_shift", "training", "vacation", "sick_leave", "unavailable", "other"]

const SK_DAYS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"]
const SK_MONTHS = [
  "Január", "Február", "Marec", "Apríl", "Máj", "Jún",
  "Júl", "August", "September", "Október", "November", "December",
]

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Monday-based index (0 = Monday ... 6 = Sunday). */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

function startOfWeek(d: Date): Date {
  const r = new Date(d)
  r.setDate(d.getDate() - mondayIndex(d))
  r.setHours(0, 0, 0, 0)
  return r
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(d.getDate() + n)
  return r
}

function formatLongDate(key: string): string {
  return new Date(`${key}T00:00:00`).toLocaleDateString("sk-SK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatShortDate(key: string): string {
  return new Date(`${key}T00:00:00`).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  })
}

function isMultiDay(s: { startDate: string; endDate: string }): boolean {
  return s.endDate > s.startDate
}

/** A compact summary of an entry's time/range for labels. */
function entrySummary(s: ShiftDto): string {
  if (isMultiDay(s)) {
    return `${formatShortDate(s.startDate)} – ${formatShortDate(s.endDate)}`
  }
  if (s.allDay || !s.startTime || !s.endTime) return "Celý deň"
  return `${s.startTime}–${s.endTime}`
}

const EMPTY_FORM = {
  staffUserId: "",
  entryType: "work_shift" as EntryType,
  allDay: false,
  startDate: "",
  endDate: "",
  startTime: "08:00",
  endTime: "16:00",
  location: "",
  position: "",
  notes: "",
  status: "draft" as ShiftStatus,
}

export function CalendarManager({
  currentUser,
  canWrite,
  canDelete,
  canReadAll,
  personalView = false,
}: CalendarManagerProps) {
  const router = useRouter()
  const [shifts, setShifts] = useState<ShiftDto[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const [view, setView] = useState<ViewMode>(personalView ? "list" : "month")
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  const [staffFilter, setStaffFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  // dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ShiftDto | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [overlapWarning, setOverlapWarning] = useState<OverlapDto[]>([])
  const [cancelTarget, setCancelTarget] = useState<ShiftDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ShiftDto | null>(null)

  // Visible date range based on the current view.
  const range = useMemo(() => {
    if (view === "week") {
      const from = startOfWeek(cursor)
      return { from, to: addDays(from, 6) }
    }
    if (view === "list") {
      const from = new Date(cursor)
      from.setHours(0, 0, 0, 0)
      return { from, to: addDays(from, 60) }
    }
    // month: pad to full weeks
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    return { from: startOfWeek(first), to: addDays(startOfWeek(last), 6) }
  }, [view, cursor])

  const loadShifts = useCallback(async () => {
    setLoading(true)
    setError("")
    const params = new URLSearchParams({
      from: toDateKey(range.from),
      to: toDateKey(range.to),
    })
    if (canReadAll && staffFilter !== "all") params.set("staff", staffFilter)
    if (canReadAll && statusFilter !== "all") params.set("status", statusFilter)
    if (typeFilter !== "all") params.set("type", typeFilter)
    try {
      const res = await fetch(`/api/admin/shifts?${params.toString()}`)
      if (!res.ok) {
        setError("Nepodarilo sa načítať záznamy.")
        setShifts([])
      } else {
        const data = await res.json()
        setShifts(data.shifts ?? [])
      }
    } catch {
      setError("Nepodarilo sa načítať záznamy.")
    } finally {
      setLoading(false)
    }
  }, [range.from, range.to, staffFilter, statusFilter, typeFilter, canReadAll])

  useEffect(() => {
    loadShifts()
  }, [loadShifts])

  useEffect(() => {
    if (!canWrite) return
    fetch("/api/admin/shifts/staff")
      .then((r) => (r.ok ? r.json() : { staff: [] }))
      .then((d) => setStaff(d.staff ?? []))
      .catch(() => setStaff([]))
  }, [canWrite])

  // Expand each entry across every day in its range that falls inside the
  // visible window, so multi-day entries appear on every relevant calendar cell.
  const shiftsByDay = useMemo(() => {
    const map = new Map<string, ShiftDto[]>()
    const winFrom = toDateKey(range.from)
    const winTo = toDateKey(range.to)
    for (const s of shifts) {
      let cur = new Date(`${s.startDate}T00:00:00`)
      const end = new Date(`${s.endDate}T00:00:00`)
      while (cur <= end) {
        const key = toDateKey(cur)
        if (key >= winFrom && key <= winTo) {
          const arr = map.get(key) ?? []
          arr.push(s)
          map.set(key, arr)
        }
        cur = addDays(cur, 1)
      }
    }
    // Sort each day's entries: timed work first by start time, then all-day.
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? 1 : -1
        const at = a.startTime ?? "99:99"
        const bt = b.startTime ?? "99:99"
        return at.localeCompare(bt)
      })
    }
    return map
  }, [shifts, range.from, range.to])

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin/login")
    router.refresh()
  }

  const openCreate = (dateKey?: string) => {
    setEditing(null)
    const d = dateKey ?? toDateKey(new Date())
    setForm({ ...EMPTY_FORM, startDate: d, endDate: d, staffUserId: staff[0]?.id ?? "" })
    setOverlapWarning([])
    setError("")
    setFormOpen(true)
  }

  const openEdit = (s: ShiftDto) => {
    setEditing(s)
    setForm({
      staffUserId: s.staffUserId,
      entryType: s.entryType,
      allDay: s.allDay,
      startDate: s.startDate,
      endDate: s.endDate,
      startTime: s.startTime ?? "08:00",
      endTime: s.endTime ?? "16:00",
      location: s.location,
      position: s.position,
      notes: s.notes,
      status: s.status,
    })
    setOverlapWarning([])
    setError("")
    setFormOpen(true)
  }

  // Keep endDate >= startDate as the user edits the start.
  const onStartDateChange = (value: string) => {
    setForm((f) => ({
      ...f,
      startDate: value,
      endDate: f.endDate && f.endDate >= value ? f.endDate : value,
    }))
  }

  const submitForm = async () => {
    setBusy(true)
    setError("")
    try {
      const url = editing ? `/api/admin/shifts/${editing.id}` : "/api/admin/shifts"
      const method = editing ? "PATCH" : "POST"
      const payload = {
        staffUserId: form.staffUserId,
        entryType: form.entryType,
        allDay: form.allDay,
        startDate: form.startDate,
        endDate: form.endDate,
        startTime: form.allDay ? null : form.startTime,
        endTime: form.allDay ? null : form.endTime,
        location: form.location,
        position: form.position,
        notes: form.notes,
        status: form.status,
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "Nepodarilo sa uložiť záznam.")
        return
      }
      setFormOpen(false)
      if (Array.isArray(data.overlaps) && data.overlaps.length > 0) {
        setOverlapWarning(data.overlaps)
      }
      await loadShifts()
    } finally {
      setBusy(false)
    }
  }

  const confirmCancel = async () => {
    if (!cancelTarget) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/shifts/${cancelTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      })
      if (res.ok) {
        setCancelTarget(null)
        await loadShifts()
      }
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/shifts/${deleteTarget.id}`, { method: "DELETE" })
      if (res.ok) {
        setDeleteTarget(null)
        await loadShifts()
      }
    } finally {
      setBusy(false)
    }
  }

  const periodLabel = useMemo(() => {
    if (view === "month") return `${SK_MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
    if (view === "week") {
      const from = startOfWeek(cursor)
      const to = addDays(from, 6)
      return `${from.getDate()}. ${SK_MONTHS[from.getMonth()]} – ${to.getDate()}. ${SK_MONTHS[to.getMonth()]} ${to.getFullYear()}`
    }
    return personalView ? "Nadchádzajúce záznamy" : "Zoznam záznamov"
  }, [view, cursor, personalView])

  const step = (dir: number) => {
    setCursor((c) => {
      if (view === "month") return new Date(c.getFullYear(), c.getMonth() + dir, 1)
      if (view === "week") return addDays(c, dir * 7)
      return addDays(c, dir * 30)
    })
  }

  const goToday = () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setCursor(d)
  }

  const todayKey = toDateKey(new Date())

  return (
    <div className="min-h-screen bg-[#28170F]">
      <header className="bg-[#3a251a] border-b border-[#8C6F4E]/30 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Golden Lama Coffee" width={40} height={40} className="rounded-full" />
            <h1 className="font-heading text-xl text-[#F5E3C2]">
              {personalView ? "Moje zmeny" : "Pracovný kalendár"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <a href="/admin" className="text-[#8C6F4E] hover:text-[#E09E14] text-sm flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Späť na panel
            </a>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Odhlásiť
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => step(-1)}
              className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
              aria-label="Predchádzajúce obdobie"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={goToday}
              className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
            >
              Dnes
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => step(1)}
              className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
              aria-label="Nasledujúce obdobie"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="ml-2 text-[#F5E3C2] font-medium">{periodLabel}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-[#8C6F4E]/50 overflow-hidden">
              <button
                onClick={() => setView("month")}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 ${view === "month" ? "bg-[#E09E14] text-[#28170F]" : "text-[#F5E3C2] hover:bg-[#8C6F4E]/20"}`}
              >
                <CalendarDays className="h-4 w-4" /> Mesiac
              </button>
              <button
                onClick={() => setView("week")}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 ${view === "week" ? "bg-[#E09E14] text-[#28170F]" : "text-[#F5E3C2] hover:bg-[#8C6F4E]/20"}`}
              >
                <CalendarRange className="h-4 w-4" /> Týždeň
              </button>
              <button
                onClick={() => setView("list")}
                className={`px-3 py-1.5 text-sm flex items-center gap-1 ${view === "list" ? "bg-[#E09E14] text-[#28170F]" : "text-[#F5E3C2] hover:bg-[#8C6F4E]/20"}`}
              >
                <List className="h-4 w-4" /> Zoznam
              </button>
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px] bg-[#3a251a] border-[#8C6F4E]/50 text-[#F5E3C2]">
                <SelectValue placeholder="Typ" />
              </SelectTrigger>
              <SelectContent className="bg-[#3a251a] border-[#8C6F4E]/50 text-[#F5E3C2]">
                <SelectItem value="all">Všetky typy</SelectItem>
                {ENTRY_TYPE_ORDER.map((t) => (
                  <SelectItem key={t} value={t}>
                    {typeMeta[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {canReadAll && (
              <>
                <Select value={staffFilter} onValueChange={setStaffFilter}>
                  <SelectTrigger className="w-[170px] bg-[#3a251a] border-[#8C6F4E]/50 text-[#F5E3C2]">
                    <SelectValue placeholder="Zamestnanec" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#3a251a] border-[#8C6F4E]/50 text-[#F5E3C2]">
                    <SelectItem value="all">Všetci zamestnanci</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px] bg-[#3a251a] border-[#8C6F4E]/50 text-[#F5E3C2]">
                    <SelectValue placeholder="Stav" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#3a251a] border-[#8C6F4E]/50 text-[#F5E3C2]">
                    <SelectItem value="all">Všetky stavy</SelectItem>
                    <SelectItem value="draft">Koncept</SelectItem>
                    <SelectItem value="published">Zverejnené</SelectItem>
                    <SelectItem value="cancelled">Zrušené</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}

            {canWrite && (
              <Button onClick={() => openCreate()} className="bg-[#E09E14] hover:bg-[#c88a10] text-[#28170F]">
                <Plus className="h-4 w-4 mr-2" />
                Nový záznam
              </Button>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4">
          {ENTRY_TYPE_ORDER.map((t) => (
            <div key={t} className="flex items-center gap-1.5 text-xs text-[#8C6F4E]">
              <span className={`inline-block h-2.5 w-2.5 rounded-sm ${typeMeta[t].dot}`} />
              {typeMeta[t].label}
            </div>
          ))}
        </div>

        {overlapWarning.length > 0 && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-[#E09E14]/50 bg-[#E09E14]/10 px-4 py-3 text-sm text-[#F5E3C2]">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-[#E09E14] shrink-0" />
            <span>
              Upozornenie: tento zamestnanec má v zvolenom období {overlapWarning.length}{" "}
              {overlapWarning.length === 1 ? "prekrývajúci sa záznam" : "prekrývajúce sa záznamy"}. Záznam bol napriek tomu uložený.
            </span>
          </div>
        )}

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#8C6F4E]">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Načítavam…
          </div>
        ) : view === "month" ? (
          <MonthGrid
            cursor={cursor}
            shiftsByDay={shiftsByDay}
            todayKey={todayKey}
            canWrite={canWrite}
            showStaff={canReadAll}
            onAdd={openCreate}
            onSelect={openEdit}
          />
        ) : view === "week" ? (
          <WeekGrid
            cursor={cursor}
            shiftsByDay={shiftsByDay}
            todayKey={todayKey}
            canWrite={canWrite}
            onAdd={openCreate}
            onSelect={openEdit}
            showStaff={canReadAll}
          />
        ) : (
          <ShiftList
            shifts={shifts}
            canWrite={canWrite}
            canDelete={canDelete}
            showStaff={canReadAll}
            onEdit={openEdit}
            onCancel={setCancelTarget}
            onDelete={setDeleteTarget}
          />
        )}
      </main>

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-[#3a251a] border-[#8C6F4E]/30 text-[#F5E3C2] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#F5E3C2]">
              {editing ? "Upraviť záznam" : "Nový záznam"}
            </DialogTitle>
            <DialogDescription className="text-[#8C6F4E]">
              {editing ? "Upravte detaily záznamu v kalendári." : "Naplánujte zmenu, dovolenku alebo inú neprítomnosť."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-[#F5E3C2]">Zamestnanec</Label>
              <Select value={form.staffUserId} onValueChange={(v) => setForm((f) => ({ ...f, staffUserId: v }))}>
                <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]">
                  <SelectValue placeholder="Vyberte zamestnanca" />
                </SelectTrigger>
                <SelectContent className="bg-[#3a251a] border-[#8C6F4E]/50 text-[#F5E3C2]">
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#F5E3C2]">Typ záznamu</Label>
              <Select
                value={form.entryType}
                onValueChange={(v) =>
                  setForm((f) => {
                    const next = v as EntryType
                    // Non-work types default to all-day for convenience.
                    const allDay = typeMeta[next].timed ? f.allDay : true
                    return { ...f, entryType: next, allDay }
                  })
                }
              >
                <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#3a251a] border-[#8C6F4E]/50 text-[#F5E3C2]">
                  {ENTRY_TYPE_ORDER.map((t) => (
                    <SelectItem key={t} value={t}>
                      {typeMeta[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[#F5E3C2]">Dátum od</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#F5E3C2]">Dátum do</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={form.allDay}
                onCheckedChange={(c) => setForm((f) => ({ ...f, allDay: c === true }))}
                className="border-[#8C6F4E]/60 data-[state=checked]:bg-[#E09E14] data-[state=checked]:border-[#E09E14] data-[state=checked]:text-[#28170F]"
              />
              <span className="text-sm text-[#F5E3C2]">Celodenný záznam (bez konkrétneho času)</span>
            </label>

            {!form.allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[#F5E3C2]">Začiatok</Label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#F5E3C2]">Koniec</Label>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[#F5E3C2]">Prevádzka</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="napr. Hlavná pobočka"
                  className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#F5E3C2]">Pozícia</Label>
                <Input
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                  placeholder="napr. Barista"
                  className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#F5E3C2]">Poznámka</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#F5E3C2]">Stav</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as ShiftStatus }))}>
                <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#3a251a] border-[#8C6F4E]/50 text-[#F5E3C2]">
                  <SelectItem value="draft">Koncept (nezobrazuje sa personálu)</SelectItem>
                  <SelectItem value="published">Zverejnené</SelectItem>
                  <SelectItem value="cancelled">Zrušené</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && formOpen && <p className="text-red-400 text-sm">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
            >
              Zrušiť
            </Button>
            <Button
              onClick={submitForm}
              disabled={busy}
              className="bg-[#E09E14] hover:bg-[#c88a10] text-[#28170F]"
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Uložiť" : "Vytvoriť"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirm */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <AlertDialogContent className="bg-[#3a251a] border-[#8C6F4E]/30 text-[#F5E3C2]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#F5E3C2]">Zrušiť záznam?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8C6F4E]">
              Záznam bude označený ako zrušený. Zostane viditeľný v kalendári so stavom „Zrušené“.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#8C6F4E]/50 bg-transparent text-[#F5E3C2] hover:bg-[#8C6F4E]/20">
              Späť
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              disabled={busy}
              className="bg-[#7a2e2e] hover:bg-[#682727] text-[#F5E3C2]"
            >
              Zrušiť záznam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#3a251a] border-[#8C6F4E]/30 text-[#F5E3C2]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#F5E3C2]">Natrvalo zmazať záznam?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8C6F4E]">
              Táto akcia sa nedá vrátiť. Záznam bude úplne odstránený z kalendára.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#8C6F4E]/50 bg-transparent text-[#F5E3C2] hover:bg-[#8C6F4E]/20">
              Späť
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={busy}
              className="bg-[#7a2e2e] hover:bg-[#682727] text-[#F5E3C2]"
            >
              Zmazať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ---------- shared block label ---------- */

function blockClass(s: ShiftDto): string {
  const base = typeMeta[s.entryType].block
  if (s.status === "cancelled") return `${base} line-through opacity-60`
  if (s.status === "draft") return `${base} opacity-60 ring-1 ring-inset ring-[#F5E3C2]/30`
  return base
}

function blockLabel(s: ShiftDto, showStaff: boolean): string {
  const timed = typeMeta[s.entryType].timed && !s.allDay && s.startTime
  const lead = timed ? `${s.startTime} ` : ""
  if (showStaff) return `${lead}${s.staffName}`
  return `${lead}${typeMeta[s.entryType].short}`
}

/* ---------- Month grid ---------- */

function MonthGrid({
  cursor,
  shiftsByDay,
  todayKey,
  canWrite,
  showStaff,
  onAdd,
  onSelect,
}: {
  cursor: Date
  shiftsByDay: Map<string, ShiftDto[]>
  todayKey: string
  canWrite: boolean
  showStaff: boolean
  onAdd: (dateKey: string) => void
  onSelect: (s: ShiftDto) => void
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = startOfWeek(first)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  return (
    <div className="rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[#8C6F4E]/30">
        {SK_DAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-[#E09E14]">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const key = toDateKey(d)
          const inMonth = d.getMonth() === cursor.getMonth()
          const dayShifts = shiftsByDay.get(key) ?? []
          const isToday = key === todayKey
          return (
            <div
              key={i}
              className={`min-h-[104px] border-b border-r border-[#8C6F4E]/15 p-1.5 ${
                inMonth ? "" : "bg-[#28170F]/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs ${
                    isToday
                      ? "bg-[#E09E14] text-[#28170F] rounded-full w-5 h-5 flex items-center justify-center font-bold"
                      : inMonth
                        ? "text-[#F5E3C2]"
                        : "text-[#8C6F4E]"
                  }`}
                >
                  {d.getDate()}
                </span>
                {canWrite && inMonth && (
                  <button
                    onClick={() => onAdd(key)}
                    className="text-[#8C6F4E] hover:text-[#E09E14]"
                    aria-label={`Pridať záznam ${key}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {dayShifts.slice(0, 3).map((s) => (
                  <button
                    key={`${s.id}-${key}`}
                    onClick={() => onSelect(s)}
                    className={`w-full text-left rounded px-1.5 py-0.5 text-[11px] leading-tight truncate ${blockClass(s)}`}
                    title={`${typeMeta[s.entryType].label} · ${s.staffName} · ${entrySummary(s)}`}
                  >
                    {blockLabel(s, showStaff)}
                  </button>
                ))}
                {dayShifts.length > 3 && (
                  <div className="text-[10px] text-[#8C6F4E] px-1">+{dayShifts.length - 3} ďalšie</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Week grid ---------- */

function WeekGrid({
  cursor,
  shiftsByDay,
  todayKey,
  canWrite,
  onAdd,
  onSelect,
  showStaff,
}: {
  cursor: Date
  shiftsByDay: Map<string, ShiftDto[]>
  todayKey: string
  canWrite: boolean
  onAdd: (dateKey: string) => void
  onSelect: (s: ShiftDto) => void
  showStaff: boolean
}) {
  const start = startOfWeek(cursor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
      {days.map((d, i) => {
        const key = toDateKey(d)
        const dayShifts = shiftsByDay.get(key) ?? []
        const isToday = key === todayKey
        return (
          <div key={i} className="rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] p-2 min-h-[140px]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs text-[#E09E14]">{SK_DAYS[i]}</div>
                <div className={`text-sm ${isToday ? "text-[#E09E14] font-bold" : "text-[#F5E3C2]"}`}>
                  {d.getDate()}. {SK_MONTHS[d.getMonth()].slice(0, 3)}
                </div>
              </div>
              {canWrite && (
                <button onClick={() => onAdd(key)} className="text-[#8C6F4E] hover:text-[#E09E14]" aria-label="Pridať">
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {dayShifts.length === 0 && <p className="text-[11px] text-[#8C6F4E]">Žiadne záznamy</p>}
              {dayShifts.map((s) => (
                <button
                  key={`${s.id}-${key}`}
                  onClick={() => onSelect(s)}
                  className={`w-full text-left rounded px-2 py-1 text-xs ${blockClass(s)}`}
                >
                  <div className="font-medium">
                    {typeMeta[s.entryType].timed && !s.allDay && s.startTime
                      ? `${s.startTime}–${s.endTime}`
                      : typeMeta[s.entryType].short}
                  </div>
                  {showStaff && <div className="truncate">{s.staffName}</div>}
                  {typeMeta[s.entryType].timed && s.position && (
                    <div className="opacity-80 truncate">{s.position}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- List view ---------- */

function ShiftList({
  shifts,
  canWrite,
  canDelete,
  showStaff,
  onEdit,
  onCancel,
  onDelete,
}: {
  shifts: ShiftDto[]
  canWrite: boolean
  canDelete: boolean
  showStaff: boolean
  onEdit: (s: ShiftDto) => void
  onCancel: (s: ShiftDto) => void
  onDelete: (s: ShiftDto) => void
}) {
  if (shifts.length === 0) {
    return (
      <div className="rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] py-16 text-center text-[#8C6F4E]">
        Žiadne záznamy v tomto období.
      </div>
    )
  }

  // group by start date
  const groups = new Map<string, ShiftDto[]>()
  for (const s of shifts) {
    const arr = groups.get(s.startDate) ?? []
    arr.push(s)
    groups.set(s.startDate, arr)
  }

  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([date, items]) => (
        <div key={date}>
          <h3 className="text-[#E09E14] text-sm font-medium mb-2 capitalize">{formatLongDate(date)}</h3>
          <div className="rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] divide-y divide-[#8C6F4E]/15">
            {items.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-4 min-w-0">
                  <span
                    className={`inline-block h-8 w-1.5 rounded-full ${typeMeta[s.entryType].dot} shrink-0`}
                    aria-hidden
                  />
                  <div className="flex items-center gap-1.5 text-[#F5E3C2] text-sm whitespace-nowrap">
                    <Clock className="h-4 w-4 text-[#8C6F4E]" />
                    {entrySummary(s)}
                  </div>
                  <div className="min-w-0">
                    {showStaff && <div className="text-[#F5E3C2] font-medium truncate">{s.staffName}</div>}
                    <div className="flex items-center gap-2 text-xs text-[#8C6F4E]">
                      <span className="truncate">{typeMeta[s.entryType].label}</span>
                      {s.position && <span className="truncate">· {s.position}</span>}
                      {s.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3" />
                          {s.location}
                        </span>
                      )}
                    </div>
                    {s.notes && <p className="text-xs text-[#F5E3C2]/60 mt-0.5 truncate">{s.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isMultiDay(s) && (
                    <Badge className="bg-[#28170F] text-[#8C6F4E] border border-[#8C6F4E]/40">Viacdňové</Badge>
                  )}
                  <Badge className={statusMeta[s.status].className}>{statusMeta[s.status].label}</Badge>
                  {canWrite && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Upraviť"
                        onClick={() => onEdit(s)}
                        className="text-[#8C6F4E] hover:text-[#E09E14] hover:bg-[#8C6F4E]/10"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {s.status !== "cancelled" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Zrušiť záznam"
                          onClick={() => onCancel(s)}
                          className="text-[#8C6F4E] hover:text-[#F5E3C2] hover:bg-[#8C6F4E]/10"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                  {canDelete && (
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Zmazať"
                      onClick={() => onDelete(s)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
