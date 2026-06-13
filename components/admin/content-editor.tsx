"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PageContent } from "@/lib/types"
import { Save, Plus, Trash2 } from "lucide-react"

interface ContentEditorProps {
  content: PageContent
  setContent: (content: PageContent) => void
}

export function ContentEditor({ content, setContent }: ContentEditorProps) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const handleSave = async () => {
    setSaving(true)
    setMessage("")
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      })
      if (res.ok) {
        setMessage("Obsah bol ulozeny!")
      } else {
        setMessage("Chyba pri ukladani")
      }
    } catch {
      setMessage("Chyba pripojenia")
    }
    setSaving(false)
  }

  const updateHero = (field: keyof PageContent["hero"], value: string) => {
    setContent({
      ...content,
      hero: { ...content.hero, [field]: value }
    })
  }

  const updateAbout = (field: keyof PageContent["about"], value: string | string[]) => {
    setContent({
      ...content,
      about: { ...content.about, [field]: value }
    })
  }

  const updateContact = (field: keyof PageContent["contact"], value: string) => {
    setContent({
      ...content,
      contact: { ...content.contact, [field]: value }
    })
  }

  const updateEvents = (field: string, value: string) => {
    setContent({
      ...content,
      events: { ...(content.events || {}), [field]: value }
    })
  }

  const updateApp = (field: string, value: string) => {
    setContent({
      ...content,
      app: { ...(content.app || {}), [field]: value }
    })
  }

  const updateFooter = (field: string, value: string) => {
    setContent({
      ...content,
      footer: { ...(content.footer || {}), [field]: value }
    })
  }

  const updateParagraph = (index: number, value: string) => {
    const newParagraphs = [...(content.about?.paragraphs || [])]
    newParagraphs[index] = value
    updateAbout("paragraphs", newParagraphs)
  }

  const addParagraph = () => {
    const newParagraphs = [...(content.about?.paragraphs || []), ""]
    updateAbout("paragraphs", newParagraphs)
  }

  const removeParagraph = (index: number) => {
    const newParagraphs = [...(content.about?.paragraphs || [])]
    newParagraphs.splice(index, 1)
    updateAbout("paragraphs", newParagraphs)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl text-[#F5E3C2]">Upravit Obsah</h2>
        <div className="flex items-center gap-4">
          {message && <span className="text-[#E09E14] text-sm">{message}</span>}
          <Button onClick={handleSave} disabled={saving} className="bg-[#E09E14] hover:bg-[#E09E14]/90 text-[#28170F]">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Ukladam..." : "Ulozit"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-[#3a251a] border-[#8C6F4E]/30">
          <CardHeader>
            <CardTitle className="text-[#E09E14]">Hero Sekcia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Podnadpis</label>
              <Input
                value={content.hero?.subtitle || ""}
                onChange={(e) => updateHero("subtitle", e.target.value)}
                className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
              />
            </div>
            <div>
              <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Nadpis</label>
              <Input
                value={content.hero?.title || ""}
                onChange={(e) => updateHero("title", e.target.value)}
                className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
              />
            </div>
            <div>
              <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Popis</label>
              <Textarea
                value={content.hero?.description || ""}
                onChange={(e) => updateHero("description", e.target.value)}
                className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#3a251a] border-[#8C6F4E]/30">
          <CardHeader>
            <CardTitle className="text-[#E09E14]">O Nas Sekcia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Nadpis</label>
              <Input
                value={content.about?.title || ""}
                onChange={(e) => updateAbout("title", e.target.value)}
                className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
              />
            </div>
            <div>
              <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Odseky</label>
              {(content.about?.paragraphs || []).map((para, index) => (
                <div key={`para-${index}`} className="flex gap-2 mb-2">
                  <Textarea
                    value={para}
                    onChange={(e) => updateParagraph(index, e.target.value)}
                    className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                    rows={2}
                  />
                  <Button
                    onClick={() => removeParagraph(index)}
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                onClick={addParagraph}
                variant="outline"
                size="sm"
                className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Pridat odsek
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#3a251a] border-[#8C6F4E]/30 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-[#E09E14]">Kontakt Sekcia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Email</label>
                <Input
                  value={content.contact?.email || ""}
                  onChange={(e) => updateContact("email", e.target.value)}
                  className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                />
              </div>
              <div>
                <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Telefon</label>
                <Input
                  value={content.contact?.phone || ""}
                  onChange={(e) => updateContact("phone", e.target.value)}
                  className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                />
              </div>
              <div>
                <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Instagram</label>
                <Input
                  value={content.contact?.instagram || ""}
                  onChange={(e) => updateContact("instagram", e.target.value)}
                  className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                  placeholder="@goldenlamacoffee"
                />
              </div>
              <div>
                <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Facebook URL</label>
                <Input
                  value={content.contact?.facebook || ""}
                  onChange={(e) => updateContact("facebook" as keyof PageContent["contact"], e.target.value)}
                  className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div>
                <label className="text-sm text-[#F5E3C2]/70 mb-1 block">TikTok URL</label>
                <Input
                  value={content.contact?.tiktok || ""}
                  onChange={(e) => updateContact("tiktok" as keyof PageContent["contact"], e.target.value)}
                  className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                  placeholder="https://tiktok.com/@..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events / Private booking */}
        <Card className="bg-[#3a251a] border-[#8C6F4E]/30">
          <CardHeader>
            <CardTitle className="text-[#E09E14]">Akcie / Rezervácie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Podnadpis</label>
              <Input
                value={content.events?.subtitle || ""}
                onChange={(e) => updateEvents("subtitle", e.target.value)}
                className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
              />
            </div>
            <div>
              <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Nadpis</label>
              <Input
                value={content.events?.title || ""}
                onChange={(e) => updateEvents("title", e.target.value)}
                className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
              />
            </div>
            <div>
              <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Popis</label>
              <Textarea
                value={content.events?.description || ""}
                onChange={(e) => updateEvents("description", e.target.value)}
                className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Text tlačidla</label>
                <Input
                  value={content.events?.ctaText || ""}
                  onChange={(e) => updateEvents("ctaText", e.target.value)}
                  className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                />
              </div>
              <div>
                <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Odkaz tlačidla</label>
                <Input
                  value={content.events?.ctaLink || ""}
                  onChange={(e) => updateEvents("ctaLink", e.target.value)}
                  className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                  placeholder="mailto:... alebo #contact"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App / Loyalty */}
        <Card className="bg-[#3a251a] border-[#8C6F4E]/30">
          <CardHeader>
            <CardTitle className="text-[#E09E14]">Aplikácia / Vernosť</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Podnadpis</label>
              <Input
                value={content.app?.subtitle || ""}
                onChange={(e) => updateApp("subtitle", e.target.value)}
                className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
              />
            </div>
            <div>
              <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Nadpis</label>
              <Input
                value={content.app?.title || ""}
                onChange={(e) => updateApp("title", e.target.value)}
                className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
              />
            </div>
            <div>
              <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Popis</label>
              <Textarea
                value={content.app?.description || ""}
                onChange={(e) => updateApp("description", e.target.value)}
                className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-[#F5E3C2]/70 mb-1 block">App Store odkaz</label>
                <Input
                  value={content.app?.iosLink || ""}
                  onChange={(e) => updateApp("iosLink", e.target.value)}
                  className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                />
              </div>
              <div>
                <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Google Play odkaz</label>
                <Input
                  value={content.app?.androidLink || ""}
                  onChange={(e) => updateApp("androidLink", e.target.value)}
                  className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <Card className="bg-[#3a251a] border-[#8C6F4E]/30 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-[#E09E14]">Pätička</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Text pätičky</label>
              <Textarea
                value={content.footer?.text || ""}
                onChange={(e) => updateFooter("text", e.target.value)}
                className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
