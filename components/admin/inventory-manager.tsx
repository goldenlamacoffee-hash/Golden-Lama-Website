"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Boxes,
  Wrench,
  AlertTriangle,
  Euro,
  ArrowDownUp,
  Search,
  ExternalLink,
} from "lucide-react"
import { priceWithVat, priceWithoutVat, normalizeVatRate, DEFAULT_VAT_RATE } from "@/lib/vat"

export type InventoryKind = "operating" | "asset"
export type MovementType = "purchase" | "usage" | "adjustment" | "waste" | "transfer"

export interface ItemDto {
  id: string
  itemCode: string | null
  name: string
  inventoryKind: InventoryKind
  category: string | null
  unit: string | null
  unitPriceWithoutVat: number | null
  unitPriceWithVat: number | null
  purchasePriceWithoutVat: number | null
  purchasePriceWithVat: number | null
  vatRate: number | null
  stockQuantity: number
  minimumStock: number | null
  status: string | null
  notes: string | null
  shopUrl: string | null
  powerWatts: string | null
  isActive: boolean
  stockValueWithVat: number
  stockValueWithoutVat: number
  stockValue: number
  lowStock: boolean
}

export interface MovementDto {
  id: string
  itemId: string
  itemName: string
  itemCode: string | null
  movementType: MovementType
  quantityChange: number
  unitPriceWithoutVat: number | null
  unitPriceWithVat: number | null
  vatRate: number | null
  note: string | null
  createdByName: string | null
  createdAt: string
}

interface Summary {
  operatingCount: number
  assetCount: number
  operatingStockValueWithVat: number
  operatingStockValueWithoutVat: number
  assetStockValueWithVat: number
  assetStockValueWithoutVat: number
  totalStockValueWithVat: number
  totalStockValueWithoutVat: number
  lowStockCount: number
}

interface InventoryManagerProps {
  currentUser: { id: string; name: string; email: string }
  canWrite: boolean
  canDelete: boolean
}

const KIND_LABELS: Record<InventoryKind, string> = {
  operating: "Prevádzkový sklad",
  asset: "Majetok / vybavenie",
}

const MOVEMENT_META: Record<MovementType, { label: string; className: string; sign: 1 | -1 | 0 }> = {
  purchase: { label: "Nákup", className: "bg-[#3b6b4a] text-[#F5E3C2]", sign: 1 },
  usage: { label: "Spotreba", className: "bg-[#9a5b2e] text-[#F5E3C2]", sign: -1 },
  waste: { label: "Odpad", className: "bg-[#7a2e2e] text-[#F5E3C2]", sign: -1 },
  adjustment: { label: "Korekcia", className: "bg-[#4a3526] text-[#F5E3C2]", sign: 0 },
  transfer: { label: "Presun", className: "bg-[#2f6f7a] text-[#F5E3C2]", sign: 0 },
}

// Predefined item statuses from the source spreadsheet.
const STATUS_OPTIONS = ["Skladem", "Objednať", "Dochádza", "Kúpené", "Plánované", "Vyradené"]

function eur(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR" }).format(value)
}

function qty(value: number, unit: string | null): string {
  const formatted = new Intl.NumberFormat("sk-SK", { maximumFractionDigits: 3 }).format(value)
  return unit ? `${formatted} ${unit}` : formatted
}

interface ItemFormState {
  itemCode: string
  name: string
  inventoryKind: InventoryKind
  category: string
  unit: string
  // Single VAT price block; meaning depends on kind (operating = unit/sale price,
  // asset = purchase price). Mapped to the correct DB columns on save.
  priceWithoutVat: string
  priceWithVat: string
  vatRate: string
  // Tracks which price the user last edited, so VAT-rate changes recalc the right side.
  priceSource: "withoutVat" | "withVat"
  stockQuantity: string
  minimumStock: string
  status: string
  notes: string
  shopUrl: string
  powerWatts: string
}

function emptyItemForm(kind: InventoryKind): ItemFormState {
  return {
    itemCode: "",
    name: "",
    inventoryKind: kind,
    category: "",
    unit: "",
    priceWithoutVat: "",
    priceWithVat: "",
    vatRate: String(DEFAULT_VAT_RATE),
    priceSource: "withoutVat",
    stockQuantity: "0",
    minimumStock: "",
    status: "",
    notes: "",
    shopUrl: "",
    powerWatts: "",
  }
}

function itemToForm(item: ItemDto): ItemFormState {
  const withoutVat = item.inventoryKind === "asset" ? item.purchasePriceWithoutVat : item.unitPriceWithoutVat
  const withVat = item.inventoryKind === "asset" ? item.purchasePriceWithVat : item.unitPriceWithVat
  return {
    itemCode: item.itemCode ?? "",
    name: item.name,
    inventoryKind: item.inventoryKind,
    category: item.category ?? "",
    unit: item.unit ?? "",
    priceWithoutVat: withoutVat?.toString() ?? "",
    priceWithVat: withVat?.toString() ?? "",
    vatRate: (item.vatRate ?? DEFAULT_VAT_RATE).toString(),
    priceSource: "withoutVat",
    stockQuantity: item.stockQuantity.toString(),
    minimumStock: item.minimumStock?.toString() ?? "",
    status: item.status ?? "",
    notes: item.notes ?? "",
    shopUrl: item.shopUrl ?? "",
    powerWatts: item.powerWatts ?? "",
  }
}

/** Recomputes the VAT price block when one input changes, keeping the edited field as truth. */
function recalcItemPrices(
  form: ItemFormState,
  field: "priceWithoutVat" | "priceWithVat" | "vatRate",
  value: string,
): ItemFormState {
  const next = { ...form, [field]: value }
  const rate = normalizeVatRate(value === "" && field === "vatRate" ? DEFAULT_VAT_RATE : Number(next.vatRate))
  if (field === "priceWithoutVat") {
    next.priceSource = "withoutVat"
    next.priceWithVat = value.trim() === "" ? "" : String(priceWithVat(Number(value), rate))
  } else if (field === "priceWithVat") {
    next.priceSource = "withVat"
    next.priceWithoutVat = value.trim() === "" ? "" : String(priceWithoutVat(Number(value), rate))
  } else {
    // vatRate changed: recompute the non-source side from the source side.
    if (next.priceSource === "withVat" && next.priceWithVat.trim() !== "") {
      next.priceWithoutVat = String(priceWithoutVat(Number(next.priceWithVat), rate))
    } else if (next.priceWithoutVat.trim() !== "") {
      next.priceWithVat = String(priceWithVat(Number(next.priceWithoutVat), rate))
    }
  }
  return next
}

export function InventoryManager({ currentUser, canWrite, canDelete }: InventoryManagerProps) {
  const router = useRouter()
  const [items, setItems] = useState<ItemDto[]>([])
  const [movements, setMovements] = useState<MovementDto[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [activeTab, setActiveTab] = useState<"operating" | "asset" | "movements">("operating")

  // Item dialog
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<ItemDto | null>(null)
  const [itemForm, setItemForm] = useState<ItemFormState>(emptyItemForm("operating"))

  // Movement dialog
  const [movementDialogOpen, setMovementDialogOpen] = useState(false)
  const [movementItem, setMovementItem] = useState<ItemDto | null>(null)
  const [movementType, setMovementType] = useState<MovementType>("purchase")
  const [movementQty, setMovementQty] = useState("")
  const [movementPriceWithoutVat, setMovementPriceWithoutVat] = useState("")
  const [movementPriceWithVat, setMovementPriceWithVat] = useState("")
  const [movementVatRate, setMovementVatRate] = useState(String(DEFAULT_VAT_RATE))
  const [movementPriceSource, setMovementPriceSource] = useState<"withoutVat" | "withVat">("withoutVat")
  const [movementNote, setMovementNote] = useState("")

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<ItemDto | null>(null)

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin/login")
    router.refresh()
  }

  const loadItems = useCallback(async () => {
    const params = new URLSearchParams()
    if (search.trim()) params.set("search", search.trim())
    if (lowStockOnly) params.set("lowStock", "true")
    const res = await fetch(`/api/admin/inventory/items?${params.toString()}`)
    if (res.ok) {
      const data = await res.json()
      setItems(data.items)
      setSummary(data.summary)
    }
  }, [search, lowStockOnly])

  const loadMovements = useCallback(async () => {
    const res = await fetch(`/api/admin/inventory/movements?limit=200`)
    if (res.ok) {
      const data = await res.json()
      setMovements(data.movements)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadItems(), loadMovements()]).finally(() => setLoading(false))
  }, [loadItems, loadMovements])

  const operatingItems = useMemo(() => items.filter((i) => i.inventoryKind === "operating"), [items])
  const assetItems = useMemo(() => items.filter((i) => i.inventoryKind === "asset"), [items])

  function openCreate(kind: InventoryKind) {
    setEditItem(null)
    setItemForm(emptyItemForm(kind))
    setError("")
    setItemDialogOpen(true)
  }

  function openEdit(item: ItemDto) {
    setEditItem(item)
    setItemForm(itemToForm(item))
    setError("")
    setItemDialogOpen(true)
  }

  function openMovement(item: ItemDto) {
    setMovementItem(item)
    setMovementType("purchase")
    setMovementQty("")
    const rate = item.vatRate ?? DEFAULT_VAT_RATE
    const presetWithVat = item.inventoryKind === "asset" ? item.purchasePriceWithVat : item.unitPriceWithVat
    const presetWithoutVat = item.inventoryKind === "asset" ? item.purchasePriceWithoutVat : item.unitPriceWithoutVat
    setMovementVatRate(String(rate))
    setMovementPriceWithVat(presetWithVat?.toString() ?? "")
    setMovementPriceWithoutVat(presetWithoutVat?.toString() ?? "")
    setMovementPriceSource("withoutVat")
    setMovementNote("")
    setError("")
    setMovementDialogOpen(true)
  }

  function handleMovementPriceChange(field: "withoutVat" | "withVat" | "vatRate", value: string) {
    if (field === "vatRate") {
      setMovementVatRate(value)
      const rate = normalizeVatRate(value === "" ? DEFAULT_VAT_RATE : Number(value))
      if (movementPriceSource === "withVat" && movementPriceWithVat.trim() !== "") {
        setMovementPriceWithoutVat(String(priceWithoutVat(Number(movementPriceWithVat), rate)))
      } else if (movementPriceWithoutVat.trim() !== "") {
        setMovementPriceWithVat(String(priceWithVat(Number(movementPriceWithoutVat), rate)))
      }
      return
    }
    const rate = normalizeVatRate(Number(movementVatRate) || DEFAULT_VAT_RATE)
    if (field === "withoutVat") {
      setMovementPriceWithoutVat(value)
      setMovementPriceSource("withoutVat")
      setMovementPriceWithVat(value.trim() === "" ? "" : String(priceWithVat(Number(value), rate)))
    } else {
      setMovementPriceWithVat(value)
      setMovementPriceSource("withVat")
      setMovementPriceWithoutVat(value.trim() === "" ? "" : String(priceWithoutVat(Number(value), rate)))
    }
  }

  async function handleSaveItem() {
    setBusy(true)
    setError("")
    const isAsset = itemForm.inventoryKind === "asset"
    const priceWithoutVat = itemForm.priceWithoutVat.trim() || null
    const priceWithVat = itemForm.priceWithVat.trim() || null
    const payload = {
      itemCode: itemForm.itemCode.trim() || null,
      name: itemForm.name,
      inventoryKind: itemForm.inventoryKind,
      category: itemForm.category.trim() || null,
      unit: itemForm.unit.trim() || null,
      vatRate: itemForm.vatRate.trim() || null,
      // Map the single VAT price block to the columns matching the item kind.
      unitPriceWithoutVat: isAsset ? null : priceWithoutVat,
      unitPriceWithVat: isAsset ? null : priceWithVat,
      purchasePriceWithoutVat: isAsset ? priceWithoutVat : null,
      purchasePriceWithVat: isAsset ? priceWithVat : null,
      priceSource: isAsset
        ? itemForm.priceSource === "withVat"
          ? "purchaseWithVat"
          : "purchaseWithoutVat"
        : itemForm.priceSource === "withVat"
          ? "unitWithVat"
          : "unitWithoutVat",
      stockQuantity: itemForm.stockQuantity.trim() || "0",
      minimumStock: itemForm.minimumStock.trim() || null,
      status: itemForm.status.trim() || null,
      notes: itemForm.notes.trim() || null,
      shopUrl: itemForm.shopUrl.trim() || null,
      powerWatts: itemForm.powerWatts.trim() || null,
    }
    try {
      const res = editItem
        ? await fetch(`/api/admin/inventory/items/${editItem.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/admin/inventory/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Nepodarilo sa uložiť položku.")
        return
      }
      setItemDialogOpen(false)
      await loadItems()
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveMovement() {
    if (!movementItem) return
    setBusy(true)
    setError("")
    // usage/waste reduce stock -> send a negative change; purchase adds.
    const raw = Number(movementQty)
    const meta = MOVEMENT_META[movementType]
    const signed = meta.sign === -1 ? -Math.abs(raw) : meta.sign === 1 ? Math.abs(raw) : raw
    const payload = {
      itemId: movementItem.id,
      movementType,
      quantityChange: signed,
      unitPriceWithoutVat: movementPriceWithoutVat.trim() || null,
      unitPriceWithVat: movementPriceWithVat.trim() || null,
      vatRate: movementVatRate.trim() || null,
      priceSource: movementPriceSource,
      note: movementNote.trim() || null,
    }
    try {
      const res = await fetch(`/api/admin/inventory/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Nepodarilo sa zaznamenať pohyb.")
        return
      }
      setMovementDialogOpen(false)
      await Promise.all([loadItems(), loadMovements()])
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/inventory/items/${deleteTarget.id}`, { method: "DELETE" })
      if (res.ok) {
        setDeleteTarget(null)
        await loadItems()
      }
    } finally {
      setBusy(false)
    }
  }

  const isMovementSigned = MOVEMENT_META[movementType].sign

  function renderItemsTable(list: ItemDto[], kind: InventoryKind) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#8C6F4E]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Hľadať podľa názvu, kódu alebo kategórie"
                className="pl-8 w-72 max-w-full bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLowStockOnly((v) => !v)}
              className={`border-[#8C6F4E]/50 h-9 text-xs ${lowStockOnly ? "bg-[#9a5b2e] text-[#F5E3C2]" : "text-[#F5E3C2] hover:bg-[#8C6F4E]/20"}`}
            >
              <AlertTriangle className="h-4 w-4 mr-1.5" />
              Len nízky stav
            </Button>
          </div>
          {canWrite && (
            <Button
              onClick={() => openCreate(kind)}
              className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nová položka
            </Button>
          )}
        </div>

        {list.length === 0 ? (
          <div className="rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] px-4 py-10 text-center text-[#8C6F4E]">
            Žiadne položky.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#8C6F4E]/30">
            <table className="w-full text-sm">
              <thead className="bg-[#3a251a] text-[#8C6F4E]">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Kód</th>
                  <th className="px-3 py-2 text-left font-medium">Názov</th>
                  <th className="px-3 py-2 text-left font-medium">Typ</th>
                  <th className="px-3 py-2 text-right font-medium">Cena bez DPH</th>
                  <th className="px-3 py-2 text-right font-medium">DPH %</th>
                  <th className="px-3 py-2 text-right font-medium">Cena s DPH</th>
                  <th className="px-3 py-2 text-right font-medium">{kind === "asset" ? "Množstvo" : "Skladem"}</th>
                  <th className="px-3 py-2 text-right font-medium">Hodnota bez DPH</th>
                  <th className="px-3 py-2 text-right font-medium">Hodnota s DPH</th>
                  <th className="px-3 py-2 text-left font-medium">Stav</th>
                  {kind === "asset" && <th className="px-3 py-2 text-right font-medium">Príkon</th>}
                  <th className="px-3 py-2 text-right font-medium">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#8C6F4E]/20">
                {list.map((item) => (
                  <tr key={item.id} className="bg-[#28170F] text-[#F5E3C2] hover:bg-[#3a251a]/60">
                    <td className="px-3 py-2 font-mono text-xs text-[#8C6F4E]">{item.itemCode ?? "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span>{item.name}</span>
                        {item.lowStock && (
                          <Badge className="bg-[#9a5b2e] text-[#F5E3C2] text-[10px]">Nízky stav</Badge>
                        )}
                        {item.shopUrl && (
                          <a
                            href={item.shopUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Eshop"
                            className="text-[#8C6F4E] hover:text-[#E09E14]"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[#8C6F4E]">{item.category ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {eur(kind === "asset" ? item.purchasePriceWithoutVat : item.unitPriceWithoutVat)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#8C6F4E]">
                      {item.vatRate !== null ? `${item.vatRate} %` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {eur(kind === "asset" ? item.purchasePriceWithVat : item.unitPriceWithVat)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {qty(item.stockQuantity, item.unit)}
                      {kind !== "asset" && item.minimumStock !== null && (
                        <div className="text-xs text-[#8C6F4E]">min {qty(item.minimumStock, item.unit)}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#8C6F4E]">{eur(item.stockValueWithoutVat)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#E09E14]">{eur(item.stockValueWithVat)}</td>
                    <td className="px-3 py-2">
                      {item.status ? (
                        <Badge className="bg-[#4a3526] text-[#F5E3C2] text-[10px]">{item.status}</Badge>
                      ) : (
                        <span className="text-[#8C6F4E]">—</span>
                      )}
                    </td>
                    {kind === "asset" && (
                      <td className="px-3 py-2 text-right tabular-nums text-[#8C6F4E]">{item.powerWatts ?? "—"}</td>
                    )}
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {canWrite && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Pohyb skladu"
                            onClick={() => openMovement(item)}
                            className="text-[#F5E3C2] hover:bg-[#8C6F4E]/20 h-8 w-8"
                          >
                            <ArrowDownUp className="h-4 w-4" />
                          </Button>
                        )}
                        {canWrite && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Upraviť"
                            onClick={() => openEdit(item)}
                            className="text-[#F5E3C2] hover:bg-[#8C6F4E]/20 h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Odstrániť"
                            onClick={() => {
                              setDeleteTarget(item)
                              setError("")
                            }}
                            className="text-red-400 hover:bg-red-500/10 h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#28170F]">
      <header className="bg-[#3a251a] border-b border-[#8C6F4E]/30 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Golden Lama Coffee" width={40} height={40} className="rounded-full" />
            <h1 className="font-heading text-xl text-[#F5E3C2]">Skladové hospodárstvo</h1>
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
        {/* KPI cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] p-4">
            <div className="flex items-center gap-2 text-[#8C6F4E] text-xs">
              <Boxes className="h-4 w-4" /> Sklad bez DPH
            </div>
            <div className="mt-1 font-heading text-2xl text-[#F5E3C2]">{eur(summary?.totalStockValueWithoutVat ?? 0)}</div>
            <div className="text-xs text-[#8C6F4E]">{summary?.operatingCount ?? 0} prevádzkových položiek</div>
          </div>
          <div className="rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] p-4">
            <div className="flex items-center gap-2 text-[#8C6F4E] text-xs">
              <Euro className="h-4 w-4" /> Sklad s DPH
            </div>
            <div className="mt-1 font-heading text-2xl text-[#E09E14]">{eur(summary?.totalStockValueWithVat ?? 0)}</div>
            <div className="text-xs text-[#8C6F4E]">vrátane majetku</div>
          </div>
          <div className="rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] p-4">
            <div className="flex items-center gap-2 text-[#8C6F4E] text-xs">
              <Wrench className="h-4 w-4" /> Majetok bez DPH
            </div>
            <div className="mt-1 font-heading text-2xl text-[#F5E3C2]">{eur(summary?.assetStockValueWithoutVat ?? 0)}</div>
            <div className="text-xs text-[#8C6F4E]">{summary?.assetCount ?? 0} položiek</div>
          </div>
          <div className="rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] p-4">
            <div className="flex items-center gap-2 text-[#8C6F4E] text-xs">
              <Wrench className="h-4 w-4" /> Majetok s DPH
            </div>
            <div className="mt-1 font-heading text-2xl text-[#F5E3C2]">{eur(summary?.assetStockValueWithVat ?? 0)}</div>
            <div className="text-xs text-[#8C6F4E]">{summary?.assetCount ?? 0} položiek</div>
          </div>
          <div className="rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] p-4">
            <div className="flex items-center gap-2 text-[#8C6F4E] text-xs">
              <AlertTriangle className="h-4 w-4" /> Nízky stav
            </div>
            <div className="mt-1 font-heading text-2xl text-[#F5E3C2]">{summary?.lowStockCount ?? 0}</div>
            <div className="text-xs text-[#8C6F4E]">položiek pod minimom</div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#8C6F4E]">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Načítavam…
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-6">
            <TabsList className="bg-[#3a251a] border border-[#8C6F4E]/30">
              <TabsTrigger
                value="operating"
                className="data-[state=active]:bg-[#E09E14] data-[state=active]:text-[#28170F] text-[#F5E3C2]"
              >
                <Boxes className="h-4 w-4 mr-2" />
                Prevádzkový sklad
              </TabsTrigger>
              <TabsTrigger
                value="asset"
                className="data-[state=active]:bg-[#E09E14] data-[state=active]:text-[#28170F] text-[#F5E3C2]"
              >
                <Wrench className="h-4 w-4 mr-2" />
                Majetok
              </TabsTrigger>
              <TabsTrigger
                value="movements"
                className="data-[state=active]:bg-[#E09E14] data-[state=active]:text-[#28170F] text-[#F5E3C2]"
              >
                <ArrowDownUp className="h-4 w-4 mr-2" />
                Pohyby
              </TabsTrigger>
            </TabsList>

            <TabsContent value="operating">{renderItemsTable(operatingItems, "operating")}</TabsContent>
            <TabsContent value="asset">{renderItemsTable(assetItems, "asset")}</TabsContent>

            <TabsContent value="movements">
              {movements.length === 0 ? (
                <div className="rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] px-4 py-10 text-center text-[#8C6F4E]">
                  Zatiaľ žiadne pohyby.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-[#8C6F4E]/30">
                  <table className="w-full text-sm">
                    <thead className="bg-[#3a251a] text-[#8C6F4E]">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Dátum</th>
                        <th className="px-3 py-2 text-left font-medium">Položka</th>
                        <th className="px-3 py-2 text-left font-medium">Typ</th>
                        <th className="px-3 py-2 text-right font-medium">Zmena</th>
                        <th className="px-3 py-2 text-left font-medium">Poznámka</th>
                        <th className="px-3 py-2 text-left font-medium">Kto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#8C6F4E]/20">
                      {movements.map((m) => (
                        <tr key={m.id} className="bg-[#28170F] text-[#F5E3C2]">
                          <td className="px-3 py-2 text-[#8C6F4E] whitespace-nowrap">
                            {new Date(m.createdAt).toLocaleString("sk-SK", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="px-3 py-2">{m.itemName}</td>
                          <td className="px-3 py-2">
                            <Badge className={MOVEMENT_META[m.movementType].className}>
                              {MOVEMENT_META[m.movementType].label}
                            </Badge>
                          </td>
                          <td
                            className={`px-3 py-2 text-right tabular-nums ${m.quantityChange < 0 ? "text-red-400" : "text-[#3b6b4a]"}`}
                          >
                            {m.quantityChange > 0 ? "+" : ""}
                            {new Intl.NumberFormat("sk-SK", { maximumFractionDigits: 3 }).format(m.quantityChange)}
                          </td>
                          <td className="px-3 py-2 text-[#8C6F4E]">{m.note ?? "—"}</td>
                          <td className="px-3 py-2 text-[#8C6F4E]">{m.createdByName ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Item dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="bg-[#3a251a] border-[#8C6F4E]/40 text-[#F5E3C2] max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">{editItem ? "Upraviť položku" : "Nová položka"}</DialogTitle>
            <DialogDescription className="text-[#8C6F4E]">
              {KIND_LABELS[itemForm.inventoryKind]}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Názov *</Label>
              <Input
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
            </div>
            <div className="space-y-2">
              <Label>Druh</Label>
              <Select
                value={itemForm.inventoryKind}
                onValueChange={(v) => setItemForm({ ...itemForm, inventoryKind: v as InventoryKind })}
              >
                <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#3a251a] border-[#8C6F4E]/40 text-[#F5E3C2]">
                  <SelectItem value="operating">Prevádzkový sklad</SelectItem>
                  <SelectItem value="asset">Majetok / vybavenie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kód (voliteľné)</Label>
              <Input
                value={itemForm.itemCode}
                onChange={(e) => setItemForm({ ...itemForm, itemCode: e.target.value })}
                placeholder="Automaticky GL-XXXX"
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
            </div>
            <div className="space-y-2">
              <Label>Kategória</Label>
              <Input
                value={itemForm.category}
                onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
            </div>
            <div className="space-y-2">
              <Label>Jednotka</Label>
              <Input
                value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                placeholder="ks, kg, l…"
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
            </div>
            <div className="space-y-2">
              <Label>Množstvo na sklade</Label>
              <Input
                type="number"
                step="0.001"
                value={itemForm.stockQuantity}
                onChange={(e) => setItemForm({ ...itemForm, stockQuantity: e.target.value })}
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
              {editItem && (
                <p className="text-xs text-[#8C6F4E]">Pre presné sledovanie použite radšej Pohyb skladu.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Minimálny stav</Label>
              <Input
                type="number"
                step="0.001"
                value={itemForm.minimumStock}
                onChange={(e) => setItemForm({ ...itemForm, minimumStock: e.target.value })}
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
            </div>
            <div className="space-y-2">
              <Label>Cena bez DPH</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={itemForm.priceWithoutVat}
                onChange={(e) => setItemForm(recalcItemPrices(itemForm, "priceWithoutVat", e.target.value))}
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
            </div>
            <div className="space-y-2">
              <Label>DPH %</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={itemForm.vatRate}
                onChange={(e) => setItemForm(recalcItemPrices(itemForm, "vatRate", e.target.value))}
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
            </div>
            <div className="space-y-2">
              <Label>Cena s DPH</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={itemForm.priceWithVat}
                onChange={(e) => setItemForm(recalcItemPrices(itemForm, "priceWithVat", e.target.value))}
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
            </div>
            {itemForm.inventoryKind === "asset" && (
              <div className="space-y-2">
                <Label>Príkon (W)</Label>
                <Input
                  value={itemForm.powerWatts}
                  onChange={(e) => setItemForm({ ...itemForm, powerWatts: e.target.value })}
                  className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
                />
              </div>
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label>Odkaz na eshop</Label>
              <Input
                value={itemForm.shopUrl}
                onChange={(e) => setItemForm({ ...itemForm, shopUrl: e.target.value })}
                placeholder="https://…"
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Stav</Label>
              <Select
                value={itemForm.status || "none"}
                onValueChange={(v) => setItemForm({ ...itemForm, status: v === "none" ? "" : v })}
              >
                <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]">
                  <SelectValue placeholder="Bez stavu" />
                </SelectTrigger>
                <SelectContent className="bg-[#3a251a] border-[#8C6F4E]/40 text-[#F5E3C2]">
                  <SelectItem value="none">Bez stavu</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Poznámky</Label>
              <Textarea
                value={itemForm.notes}
                onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setItemDialogOpen(false)}
              className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
            >
              Zrušiť
            </Button>
            <Button
              onClick={handleSaveItem}
              disabled={busy}
              className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90"
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Uložiť
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement dialog */}
      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent className="bg-[#3a251a] border-[#8C6F4E]/40 text-[#F5E3C2]">
          <DialogHeader>
            <DialogTitle className="font-heading">Pohyb skladu</DialogTitle>
            <DialogDescription className="text-[#8C6F4E]">
              {movementItem?.name} · aktuálne {movementItem ? qty(movementItem.stockQuantity, movementItem.unit) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Typ pohybu</Label>
              <Select value={movementType} onValueChange={(v) => setMovementType(v as MovementType)}>
                <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#3a251a] border-[#8C6F4E]/40 text-[#F5E3C2]">
                  <SelectItem value="purchase">Nákup (pridať)</SelectItem>
                  <SelectItem value="usage">Spotreba (odobrať)</SelectItem>
                  <SelectItem value="waste">Odpis (odobrať)</SelectItem>
                  <SelectItem value="adjustment">Úprava (presná zmena ±)</SelectItem>
                  <SelectItem value="transfer">Presun (±)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {isMovementSigned === 0 ? "Zmena množstva (±)" : "Množstvo"}
              </Label>
              <Input
                type="number"
                step="0.001"
                value={movementQty}
                onChange={(e) => setMovementQty(e.target.value)}
                placeholder={isMovementSigned === 0 ? "napr. -2 alebo 5" : "napr. 10"}
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Cena bez DPH</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={movementPriceWithoutVat}
                  onChange={(e) => handleMovementPriceChange("withoutVat", e.target.value)}
                  className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">DPH %</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={movementVatRate}
                  onChange={(e) => handleMovementPriceChange("vatRate", e.target.value)}
                  className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Cena s DPH</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={movementPriceWithVat}
                  onChange={(e) => handleMovementPriceChange("withVat", e.target.value)}
                  className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Poznámka</Label>
              <Input
                value={movementNote}
                onChange={(e) => setMovementNote(e.target.value)}
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMovementDialogOpen(false)}
              className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
            >
              Zrušiť
            </Button>
            <Button
              onClick={handleSaveMovement}
              disabled={busy}
              className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90"
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Zaznamenať
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#3a251a] border-[#8C6F4E]/40 text-[#F5E3C2]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Odstrániť položku?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8C6F4E]">
              Položka „{deleteTarget?.name}" bude deaktivovaná a skrytá zo zoznamu. História pohybov ostane zachovaná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20 bg-transparent">
              Späť
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={busy}
              className="bg-[#7a2e2e] text-[#F5E3C2] hover:bg-[#7a2e2e]/90"
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Odstrániť
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
