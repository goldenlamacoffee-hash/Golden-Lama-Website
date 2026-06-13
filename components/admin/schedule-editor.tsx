"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import type { ScheduleItem } from "@/lib/types"
import { Plus, Trash2, Save } from "lucide-react"

interface ScheduleEditorProps {
  schedule: ScheduleItem[]
  setSchedule: (schedule: ScheduleItem[]) => void
}

export function ScheduleEditor({ schedule, setSchedule }: ScheduleEditorProps) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const handleSave = async () => {
    setSaving(true)
    setMessage("")
    try {
      const res = await fetch("/api/admin/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedule),
      })
      if (res.ok) {
        setMessage("Rozvrh bol uložený!")
      } else {
        setMessage("Chyba pri ukladaní")
      }
    } catch {
      setMessage("Chyba pripojenia")
    }
    setSaving(false)
  }

  const updateItem = (index: number, field: string, value: string) => {
    const newSchedule = [...schedule]
    newSchedule[index] = { ...newSchedule[index], [field]: value }
    setSchedule(newSchedule)
  }

  const addItem = () => {
    const newItem: ScheduleItem = {
      day: "Nový deň",
      location: "Nová lokalita",
      address: "Adresa",
      time: "8:00 - 14:00",
    }
    setSchedule([...schedule, newItem])
  }

  const removeItem = (index: number) => {
    const newSchedule = [...schedule]
    newSchedule.splice(index, 1)
    setSchedule(newSchedule)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl text-[#F5E3C2]">Upraviť Rozvrh</h2>
        <div className="flex items-center gap-4">
          {message && <span className="text-[#E09E14] text-sm">{message}</span>}
          <Button onClick={handleSave} disabled={saving} className="bg-[#E09E14] hover:bg-[#E09E14]/90 text-[#28170F]">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Ukladám..." : "Uložiť"}
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {schedule.map((item, index) => (
          <Card key={`sch-${index}`} className="bg-[#3a251a] border-[#8C6F4E]/30">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <Input
                  value={item.day}
                  onChange={(e) => updateItem(index, "day", e.target.value)}
                  placeholder="Deň"
                  className="bg-[#28170F] border-[#8C6F4E]/50 text-[#E09E14] font-semibold"
                />
                <Button
                  onClick={() => removeItem(index)}
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10 ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                value={item.location}
                onChange={(e) => updateItem(index, "location", e.target.value)}
                placeholder="Lokalita"
                className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]"
              />
              <Input
                value={item.address}
                onChange={(e) => updateItem(index, "address", e.target.value)}
                placeholder="Adresa"
                className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]/70 text-sm"
              />
              <Input
                value={item.time}
                onChange={(e) => updateItem(index, "time", e.target.value)}
                placeholder="Čas"
                className="bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2]/70 text-sm"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        onClick={addItem}
        variant="outline"
        className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
      >
        <Plus className="h-4 w-4 mr-2" />
        Pridať deň
      </Button>
    </div>
  )
}
