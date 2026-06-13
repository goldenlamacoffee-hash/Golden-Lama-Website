"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Save, Plus, Trash2, Loader2 } from "lucide-react"

interface LegalSection {
  heading: string
  content: string
}

interface LegalPageData {
  title: string
  lastUpdated: string
  sections: LegalSection[]
}

interface LegalEditorProps {
  type: 'privacy' | 'terms'
  initialData: LegalPageData
}

export function LegalEditor({ type, initialData }: LegalEditorProps) {
  const [data, setData] = useState<LegalPageData>(initialData || {
    title: type === 'privacy' ? 'Ochrana osobných údajov' : 'Obchodné podmienky',
    lastUpdated: '',
    sections: []
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const pageTitle = type === 'privacy' ? 'Ochrana osobných údajov' : 'Obchodné podmienky'

  const updateField = (field: keyof LegalPageData, value: string) => {
    setData({ ...data, [field]: value })
  }

  const updateSection = (index: number, field: keyof LegalSection, value: string) => {
    const newSections = [...data.sections]
    newSections[index] = { ...newSections[index], [field]: value }
    setData({ ...data, sections: newSections })
  }

  const addSection = () => {
    setData({
      ...data,
      sections: [...data.sections, { heading: "Nová sekcia", content: "" }]
    })
  }

  const removeSection = (index: number) => {
    const newSections = data.sections.filter((_, i) => i !== index)
    setData({ ...data, sections: newSections })
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage("")

    try {
      const res = await fetch(`/api/admin/${type}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        setMessage("Uložené!")
      } else {
        setMessage("Chyba pri ukladaní")
      }
    } catch {
      setMessage("Chyba pri ukladaní")
    }

    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#F5E3C2]">{pageTitle}</h2>
        <div className="flex items-center gap-3">
          {message && (
            <span className={message.includes("Chyba") ? "text-red-400" : "text-green-400"}>
              {message}
            </span>
          )}
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Uložiť
          </Button>
        </div>
      </div>

      <Card className="bg-[#3a251a] border-[#8C6F4E]/30">
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Názov stránky</label>
            <Input
              value={data.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"
            />
          </div>
          <div>
            <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Dátum poslednej aktualizácie</label>
            <Input
              value={data.lastUpdated}
              onChange={(e) => updateField("lastUpdated", e.target.value)}
              placeholder="napr. 1. júna 2026"
              className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#F5E3C2]">Sekcie</h3>
        <Button onClick={addSection} variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Pridať sekciu
        </Button>
      </div>

      <div className="space-y-4">
        {data.sections.map((section, index) => (
          <Card key={`section-${index}`} className="bg-[#3a251a] border-[#8C6F4E]/30">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Nadpis</label>
                  <Input
                    value={section.heading}
                    onChange={(e) => updateSection(index, "heading", e.target.value)}
                    className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSection(index)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10 mt-6"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <label className="text-sm text-[#F5E3C2]/70 mb-1 block">Obsah</label>
                <Textarea
                  value={section.content}
                  onChange={(e) => updateSection(index, "content", e.target.value)}
                  rows={4}
                  className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.sections.length === 0 && (
        <div className="text-center py-8 text-[#F5E3C2]/50">
          Žiadne sekcie. Kliknite na &quot;Pridať sekciu&quot; pre vytvorenie novej.
        </div>
      )}
    </div>
  )
}
