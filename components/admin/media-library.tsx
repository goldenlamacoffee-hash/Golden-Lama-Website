"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Upload,
  ImagePlus,
  Loader2,
  Search,
  Trash2,
  Pencil,
  Copy,
  Check,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react"
import { ACCEPT_ATTR, type MediaAsset } from "@/lib/media-types"

const inputClass = "bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"

interface MediaLibraryProps {
  blobConfigured: boolean
}

export function MediaLibrary({ blobConfigured }: MediaLibraryProps) {
  const [items, setItems] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState<MediaAsset | null>(null)
  const [deleting, setDeleting] = useState<MediaAsset | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async (q: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/media${q ? `?search=${encodeURIComponent(q)}` : ""}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Nepodarilo sa načítať knižnicu médií.")
        setItems([])
        return
      }
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch {
      setError("Nepodarilo sa načítať knižnicu médií.")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => load(search), 300)
    return () => clearTimeout(t)
  }, [search, load])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)
    setNotice(null)
    let count = 0
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append("file", file)
        const res = await fetch("/api/admin/media", { method: "POST", body: fd })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || "Nahrávanie zlyhalo.")
          break
        }
        count += 1
      }
      if (count > 0) setNotice(`${count} obrázkov nahraných.`)
      await load(search)
    } catch {
      setError("Nahrávanie zlyhalo.")
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleCopy = async (item: MediaAsset) => {
    try {
      await navigator.clipboard.writeText(item.url)
      setCopiedId(item.id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="min-h-screen bg-[#28170F]">
      <header className="border-b border-[#8C6F4E]/30 bg-[#3a251a] px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="font-heading text-xl text-[#F5E3C2]">Knižnica médií</h1>
            <p className="text-xs text-[#8C6F4E]">Nahrávajte a spravujte obrázky pre web</p>
          </div>
          <Button asChild variant="outline" size="sm" className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20">
            <a href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Späť do administrácie
            </a>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {!blobConfigured && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Úložisko obrázkov nie je nastavené</p>
              <p className="text-amber-200/80">
                Pridajte premennú prostredia <code className="font-mono">BLOB_READ_WRITE_TOKEN</code> (integrácia Vercel
                Blob), aby ste mohli nahrávať obrázky.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C6F4E]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hľadať podľa názvu, alt textu alebo popisu"
              className={`pl-9 ${inputClass}`}
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
            disabled={uploading || !blobConfigured}
            className="shrink-0 bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90"
          >
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {uploading ? "Nahrávam..." : "Nahrať obrázky"}
          </Button>
        </div>

        {notice && (
          <div className="flex items-center gap-2 rounded-md border border-[#E09E14]/40 bg-[#E09E14]/10 px-3 py-2 text-sm text-[#E09E14]">
            <Check className="h-4 w-4 shrink-0" />
            {notice}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#8C6F4E]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Načítavam...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-[#8C6F4E]">
            <ImagePlus className="h-10 w-10" />
            <p>Žiadne obrázky. Nahrajte prvý pomocou tlačidla „Nahrať obrázky“.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden border-[#8C6F4E]/30 bg-[#3a251a]">
                <div className="relative aspect-square bg-[#28170F]">
                  <Image
                    src={item.url || "/placeholder.svg"}
                    alt={item.altText || item.originalFilename || "Obrázok"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <CardContent className="space-y-2 p-3">
                  <p className="truncate text-sm font-medium text-[#F5E3C2]" title={item.originalFilename || ""}>
                    {item.originalFilename || item.filename || "Obrázok"}
                  </p>
                  <p className="truncate text-xs text-[#8C6F4E]" title={item.altText || ""}>
                    {item.altText ? item.altText : "Bez alt textu"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(item)}
                      className="h-8 flex-1 border-[#8C6F4E]/50 px-2 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(item)}
                      className="h-8 flex-1 border-[#8C6F4E]/50 px-2 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
                    >
                      {copiedId === item.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleting(item)}
                      className="h-8 flex-1 border-red-500/40 px-2 text-red-300 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {editing && (
        <EditMetadataDialog
          asset={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
            setEditing(null)
            setNotice("Metadáta uložené.")
          }}
        />
      )}

      {deleting && (
        <DeleteDialog
          asset={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={(id) => {
            setItems((prev) => prev.filter((i) => i.id !== id))
            setDeleting(null)
            setNotice("Obrázok bol odstránený.")
          }}
        />
      )}
    </div>
  )
}

function EditMetadataDialog({
  asset,
  onClose,
  onSaved,
}: {
  asset: MediaAsset
  onClose: () => void
  onSaved: (updated: MediaAsset) => void
}) {
  const [altText, setAltText] = useState(asset.altText || "")
  const [caption, setCaption] = useState(asset.caption || "")
  const [category, setCategory] = useState(asset.category || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/media/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ altText, caption, category }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Uloženie zlyhalo.")
        setSaving(false)
        return
      }
      onSaved(data.item)
    } catch {
      setError("Uloženie zlyhalo.")
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]">
        <DialogHeader>
          <DialogTitle className="text-[#E09E14]">Upraviť metadáta</DialogTitle>
          <DialogDescription className="text-[#8C6F4E]">
            {asset.originalFilename || asset.filename}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-[#F5E3C2]/80">Alt text</label>
            <Input value={altText} onChange={(e) => setAltText(e.target.value)} className={inputClass} placeholder="Popis pre prístupnosť" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#F5E3C2]/80">Popisok (caption)</label>
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#F5E3C2]/80">Kategória / sekcia</label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} placeholder="napr. galéria, hero" />
          </div>
          {error && (
            <p className="flex items-center gap-1 text-sm text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" /> {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20">
            Zrušiť
          </Button>
          <Button onClick={save} disabled={saving} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90">
            {saving ? "Ukladám..." : "Uložiť"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDialog({
  asset,
  onClose,
  onDeleted,
}: {
  asset: MediaAsset
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<string[] | null>(null)

  const doDelete = async (force: boolean) => {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/media/${asset.id}${force ? "?force=true" : ""}`, { method: "DELETE" })
      const data = await res.json()
      if (res.status === 409 && data.code === "MEDIA_IN_USE") {
        setUsage(Array.isArray(data.usage) ? data.usage : [])
        setError(data.error || "Obrázok sa používa.")
        setDeleting(false)
        return
      }
      if (!res.ok) {
        setError(data.error || "Mazanie zlyhalo.")
        setDeleting(false)
        return
      }
      onDeleted(asset.id)
    } catch {
      setError("Mazanie zlyhalo.")
      setDeleting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]">
        <DialogHeader>
          <DialogTitle className="text-[#E09E14]">Odstrániť obrázok</DialogTitle>
          <DialogDescription className="text-[#8C6F4E]">
            Naozaj chcete natrvalo odstrániť „{asset.originalFilename || asset.filename}“? Súbor sa zmaže z úložiska.
          </DialogDescription>
        </DialogHeader>

        {usage && usage.length > 0 && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            <p className="mb-1 flex items-center gap-1 font-medium">
              <AlertTriangle className="h-4 w-4" /> Obrázok sa práve používa
            </p>
            <ul className="ml-5 list-disc">
              {usage.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
            <p className="mt-1 text-amber-200/80">
              Odstránením vznikne na webe chýbajúci obrázok. Ak ste si istí, potvrďte vynútené odstránenie.
            </p>
          </div>
        )}

        {error && !usage && (
          <p className="flex items-center gap-1 text-sm text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" /> {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20">
            Zrušiť
          </Button>
          {usage && usage.length > 0 ? (
            <Button onClick={() => doDelete(true)} disabled={deleting} className="bg-red-500 text-white hover:bg-red-500/90">
              {deleting ? "Mažem..." : "Vynútiť odstránenie"}
            </Button>
          ) : (
            <Button onClick={() => doDelete(false)} disabled={deleting} className="bg-red-500 text-white hover:bg-red-500/90">
              {deleting ? "Mažem..." : "Odstrániť"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
