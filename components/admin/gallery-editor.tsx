"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { MediaPickerDialog } from "@/components/admin/media-picker"
import type { GalleryImage } from "@/lib/types"
import { Plus, Trash2, Save, ArrowUp, ArrowDown, ImageOff } from "lucide-react"
import Image from "next/image"

interface GalleryEditorProps {
  gallery: GalleryImage[]
  setGallery: (gallery: GalleryImage[]) => void
}

const inputClass = "bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2] text-sm"

export function GalleryEditor({ gallery, setGallery }: GalleryEditorProps) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gallery),
      })
      setMessage(
        res.ok
          ? { type: "ok", text: "Galéria bola uložená!" }
          : { type: "err", text: "Chyba pri ukladaní" },
      )
    } catch {
      setMessage({ type: "err", text: "Chyba pripojenia" })
    }
    setSaving(false)
  }

  const updateItem = (index: number, field: keyof GalleryImage, value: string | boolean) => {
    const next = [...gallery]
    next[index] = { ...next[index], [field]: value }
    setGallery(next)
  }

  const removeItem = (index: number) => {
    const next = [...gallery]
    next.splice(index, 1)
    setGallery(next)
  }

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= gallery.length) return
    const next = [...gallery]
    ;[next[index], next[target]] = [next[target], next[index]]
    setGallery(next)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl text-[#F5E3C2]">Galéria</h2>
          <p className="text-sm text-[#8C6F4E]">
            Pridajte obrázky z knižnice médií, zoraďte ich a nastavte popis a viditeľnosť.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <span className={`text-sm ${message.type === "ok" ? "text-[#E09E14]" : "text-red-400"}`}>
              {message.text}
            </span>
          )}
          <Button onClick={() => setPickerOpen(true)} variant="outline" className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20">
            <Plus className="mr-2 h-4 w-4" />
            Pridať obrázok
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#E09E14] hover:bg-[#E09E14]/90 text-[#28170F]">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Ukladám..." : "Uložiť"}
          </Button>
        </div>
      </div>

      {gallery.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[#8C6F4E]/40 py-16 text-center text-[#F5E3C2]/60">
          <ImageOff className="h-8 w-8" />
          <p>Žiadne obrázky v galérii. Pridajte prvý pomocou tlačidla „Pridať obrázok“.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((image, index) => {
            const hidden = image.visible === false
            return (
              <Card key={`img-${index}`} className="overflow-hidden border-[#8C6F4E]/30 bg-[#3a251a]">
                <div className={`relative aspect-square bg-[#28170F] ${hidden ? "opacity-50" : ""}`}>
                  <Image src={image.src || "/placeholder.svg"} alt={image.alt || ""} fill className="object-cover" unoptimized />
                  <div className="absolute right-2 top-2 flex gap-1">
                    <Button
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 bg-[#28170F]/80 p-0 text-[#F5E3C2] hover:bg-[#28170F] disabled:opacity-30"
                      aria-label="Posunúť hore"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => move(index, 1)}
                      disabled={index === gallery.length - 1}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 bg-[#28170F]/80 p-0 text-[#F5E3C2] hover:bg-[#28170F] disabled:opacity-30"
                      aria-label="Posunúť dole"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => removeItem(index)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 bg-red-500/80 p-0 text-white hover:bg-red-500"
                      aria-label="Odstrániť z galérie"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="space-y-2 p-3">
                  <Input
                    value={image.alt || ""}
                    onChange={(e) => updateItem(index, "alt", e.target.value)}
                    placeholder="Alt text (popis pre prístupnosť)"
                    className={inputClass}
                  />
                  <Input
                    value={image.caption || ""}
                    onChange={(e) => updateItem(index, "caption", e.target.value)}
                    placeholder="Popisok (voliteľné)"
                    className={inputClass}
                  />
                  <label className="flex items-center justify-between text-sm text-[#F5E3C2]/80">
                    <span>{hidden ? "Skryté" : "Zobrazené"}</span>
                    <Switch
                      checked={!hidden}
                      onCheckedChange={(v) => updateItem(index, "visible", v)}
                    />
                  </label>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <p className="text-xs text-[#8C6F4E]">
        Odstránením obrázka z galérie sa súbor nevymaže z knižnice médií — zostáva dostupný pre ďalšie použitie.
      </p>

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(asset) => {
          setGallery([
            ...gallery,
            { src: asset.url, alt: asset.altText || asset.originalFilename || "", caption: asset.caption || undefined, visible: true },
          ])
          setPickerOpen(false)
        }}
      />
    </div>
  )
}
