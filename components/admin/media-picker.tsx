"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Upload, ImagePlus, X, Library, Check, AlertTriangle, Loader2, Search } from "lucide-react"
import { ACCEPT_ATTR, type MediaAsset } from "@/lib/media-types"

interface MediaPickerProps {
  /** Currently selected image URL (or legacy path). Empty = none. */
  value?: string
  onChange: (url: string) => void
  /** Optional alt text wiring. When provided, selecting a library asset can suggest its alt. */
  alt?: string
  onAltChange?: (alt: string) => void
  /** Fallback preview when value is empty (e.g. the section's default image). */
  fallbackSrc?: string
  label?: string
}

const cardClass = "bg-[#3a251a] border border-[#8C6F4E]/30"
const inputClass = "bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"

export function MediaPicker({
  value,
  onChange,
  alt,
  onAltChange,
  fallbackSrc,
  label,
}: MediaPickerProps) {
  const [open, setOpen] = useState(false)
  const previewSrc = (value && value.trim()) || fallbackSrc || ""
  const isUsingFallback = !value?.trim() && !!fallbackSrc

  return (
    <div className="space-y-3">
      {label && <p className="text-sm font-medium text-[#F5E3C2]">{label}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-[#8C6F4E]/40 bg-[#28170F]">
          {previewSrc ? (
            <Image src={previewSrc} alt={alt || "Náhľad obrázka"} fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#8C6F4E]">
              <ImagePlus className="h-7 w-7" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setOpen(true)}
              className="bg-[#E09E14] hover:bg-[#E09E14]/90 text-[#28170F]"
            >
              <Library className="mr-2 h-4 w-4" />
              {value?.trim() ? "Zmeniť obrázok" : "Vybrať obrázok"}
            </Button>
            {value?.trim() && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onChange("")}
                className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
              >
                <X className="mr-2 h-4 w-4" />
                Odstrániť
              </Button>
            )}
          </div>
          <p className="text-xs text-[#8C6F4E]">
            {isUsingFallback
              ? "Používa sa predvolený obrázok. Vyberte vlastný cez knižnicu médií."
              : value?.trim()
                ? "Vybraný obrázok. Môžete ho nahradiť alebo odstrániť."
                : "Nahrajte nový obrázok alebo vyberte z knižnice médií."}
          </p>
        </div>
      </div>

      {onAltChange && (
        <div>
          <label className="mb-1 block text-sm text-[#F5E3C2]/80">Alt text (popis pre prístupnosť)</label>
          <Input
            value={alt || ""}
            onChange={(e) => onAltChange(e.target.value)}
            className={inputClass}
            placeholder="Stručný popis obrázka"
          />
        </div>
      )}

      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={(asset) => {
          onChange(asset.url)
          if (onAltChange && asset.altText && !alt?.trim()) onAltChange(asset.altText)
          setOpen(false)
        }}
      />
    </div>
  )
}

/** The upload + library browser dialog. Exported for reuse if needed. */
export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSelect: (asset: MediaAsset) => void
}) {
  const [items, setItems] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (q: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/media${q ? `?search=${encodeURIComponent(q)}` : ""}`)
      if (res.status === 401 || res.status === 403) {
        setError("Nemáte oprávnenie spravovať médiá.")
        setItems([])
        return
      }
      const data = await res.json()
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch {
      setError("Nepodarilo sa načítať knižnicu médií.")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (open) load(search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Debounced search.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => load(search), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)
    try {
      let firstUploaded: MediaAsset | null = null
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append("file", file)
        const res = await fetch("/api/admin/media", { method: "POST", body: fd })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || "Nahrávanie zlyhalo.")
          break
        }
        if (!firstUploaded) firstUploaded = data.item
      }
      await load(search)
      // Single upload selects immediately for a smooth flow.
      if (files.length === 1 && firstUploaded) onSelect(firstUploaded)
    } catch {
      setError("Nahrávanie zlyhalo.")
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]">
        <DialogHeader>
          <DialogTitle className="text-[#E09E14]">Knižnica médií</DialogTitle>
          <DialogDescription className="text-[#8C6F4E]">
            Nahrajte nový obrázok alebo vyberte existujúci. Povolené: JPG, PNG, WEBP (max 5 MB).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C6F4E]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hľadať podľa názvu alebo popisu"
              className="pl-9 bg-[#3a251a] border-[#8C6F4E]/50 text-[#F5E3C2]"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-[#E09E14] hover:bg-[#E09E14]/90 text-[#28170F] shrink-0"
          >
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {uploading ? "Nahrávam..." : "Nahrať nový"}
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[#8C6F4E]">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Načítavam...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-[#8C6F4E]">
              <ImagePlus className="h-8 w-8" />
              <p className="text-sm">Žiadne obrázky. Nahrajte prvý pomocou tlačidla „Nahrať nový“.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E09E14]"
                  title={item.originalFilename || item.filename || ""}
                >
                  <Image
                    src={item.url || "/placeholder.svg"}
                    alt={item.altText || item.originalFilename || "Obrázok"}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-[#28170F]/0 transition-colors group-hover:bg-[#28170F]/40">
                    <span className="flex items-center gap-1 rounded-full bg-[#E09E14] px-3 py-1 text-xs font-medium text-[#28170F] opacity-0 transition-opacity group-hover:opacity-100">
                      <Check className="h-3 w-3" /> Vybrať
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
