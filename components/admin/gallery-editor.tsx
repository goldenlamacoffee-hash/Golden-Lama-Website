"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import type { GalleryImage } from "@/lib/types"
import { Plus, Trash2, Save, Upload } from "lucide-react"
import Image from "next/image"

interface GalleryEditorProps {
  gallery: GalleryImage[]
  setGallery: (gallery: GalleryImage[]) => void
}

export function GalleryEditor({ gallery, setGallery }: GalleryEditorProps) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    setSaving(true)
    setMessage("")
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gallery),
      })
      if (res.ok) {
        setMessage("Galeria bola ulozena!")
      } else {
        setMessage("Chyba pri ukladani")
      }
    } catch {
      setMessage("Chyba pripojenia")
    }
    setSaving(false)
  }

  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img')
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const base64 = canvas.toDataURL('image/jpeg', quality)
        resolve(base64)
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setMessage("")

    try {
      const newImages: GalleryImage[] = []

      for (const file of Array.from(files)) {
        // Compress and resize image before converting to base64
        const base64 = await compressImage(file, 800, 0.7)

        newImages.push({
          src: base64,
          alt: file.name.replace(/\.[^/.]+$/, ""),
        })
      }

      setGallery([...gallery, ...newImages])
      setMessage(`${newImages.length} obrazkov pridanych`)
    } catch {
      setMessage("Chyba pri nahravani")
    }

    setUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const updateItem = (index: number, field: string, value: string) => {
    const newGallery = [...gallery]
    newGallery[index] = { ...newGallery[index], [field]: value }
    setGallery(newGallery)
  }

  const removeItem = (index: number) => {
    const newGallery = [...gallery]
    newGallery.splice(index, 1)
    setGallery(newGallery)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl text-[#F5E3C2]">Upravit Galeriu</h2>
        <div className="flex items-center gap-4">
          {message && <span className="text-[#E09E14] text-sm">{message}</span>}
          <Button onClick={handleSave} disabled={saving} className="bg-[#E09E14] hover:bg-[#E09E14]/90 text-[#28170F]">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Ukladam..." : "Ulozit"}
          </Button>
        </div>
      </div>

      {/* Upload section */}
      <Card className="bg-[#3a251a] border-[#8C6F4E]/30">
        <CardContent className="pt-4">
          <p className="text-[#F5E3C2] mb-3 font-medium">Nahrat obrazky</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-[#E09E14] hover:bg-[#E09E14]/90 text-[#28170F]"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Nahravam..." : "Vybrat obrazky"}
            </Button>
          </div>
          <p className="text-[#F5E3C2]/60 text-sm mt-2">
            Obrazky budu ulozene priamo v databaze. Odporucame mensie obrazky (do 1MB).
          </p>
        </CardContent>
      </Card>

      {/* Existing images grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {gallery.map((image, index) => (
          <Card key={`img-${index}`} className="bg-[#3a251a] border-[#8C6F4E]/30 overflow-hidden">
            <div className="relative aspect-square bg-[#28170F]">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                className="object-cover"
                unoptimized
              />
              <Button
                onClick={() => removeItem(index)}
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <CardContent className="pt-3 space-y-2">
              <Input
                value={image.alt}
                onChange={(e) => updateItem(index, "alt", e.target.value)}
                placeholder="Popis obrazka"
                className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2] text-sm"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {gallery.length === 0 && (
        <div className="text-center py-12 text-[#F5E3C2]/60">
          Ziadne obrazky v galerii. Nahrajte obrazky pomocou tlacidla vyssie.
        </div>
      )}
    </div>
  )
}
