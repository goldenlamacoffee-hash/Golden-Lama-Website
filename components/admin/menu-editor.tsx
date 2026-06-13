"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MenuCategory, MenuItem } from "@/lib/types"
import { Plus, Trash2, Save } from "lucide-react"

interface MenuEditorProps {
  menu: MenuCategory[]
  setMenu: (menu: MenuCategory[]) => void
}

export function MenuEditor({ menu, setMenu }: MenuEditorProps) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const handleSave = async () => {
    setSaving(true)
    setMessage("")
    try {
      const res = await fetch("/api/admin/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(menu),
      })
      if (res.ok) {
        setMessage("Menu bolo uložené!")
      } else {
        setMessage("Chyba pri ukladaní")
      }
    } catch {
      setMessage("Chyba pripojenia")
    }
    setSaving(false)
  }

  const updateCategory = (index: number, field: string, value: string) => {
    const newMenu = [...menu]
    newMenu[index] = { ...newMenu[index], [field]: value }
    setMenu(newMenu)
  }

  const updateItem = (catIndex: number, itemIndex: number, field: string, value: string | number) => {
    const newMenu = [...menu]
    newMenu[catIndex].items[itemIndex] = { 
      ...newMenu[catIndex].items[itemIndex], 
      [field]: value 
    }
    setMenu(newMenu)
  }

  const addItem = (catIndex: number) => {
    const newMenu = [...menu]
    const newItem: MenuItem = {
      name: "Nový nápoj",
      description: "Popis",
      price: 0,
    }
    newMenu[catIndex].items.push(newItem)
    setMenu(newMenu)
  }

  const removeItem = (catIndex: number, itemIndex: number) => {
    const newMenu = [...menu]
    newMenu[catIndex].items.splice(itemIndex, 1)
    setMenu(newMenu)
  }

  const addCategory = () => {
    const newCategory: MenuCategory = {
      category: "Nová kategória",
      items: [],
    }
    setMenu([...menu, newCategory])
  }

  const removeCategory = (index: number) => {
    const newMenu = [...menu]
    newMenu.splice(index, 1)
    setMenu(newMenu)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl text-[#F5E3C2]">Upraviť Menu</h2>
        <div className="flex items-center gap-4">
          {message && <span className="text-[#E09E14] text-sm">{message}</span>}
          <Button onClick={handleSave} disabled={saving} className="bg-[#E09E14] hover:bg-[#E09E14]/90 text-[#28170F]">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Ukladám..." : "Uložiť"}
          </Button>
        </div>
      </div>

      {menu.map((category, catIndex) => (
        <Card key={`cat-${catIndex}`} className="bg-[#3a251a] border-[#8C6F4E]/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <Input
              value={category.category}
              onChange={(e) => updateCategory(catIndex, "category", e.target.value)}
              className="max-w-xs bg-[#28170F] border-[#8C6F4E]/50 text-[#F5E3C2] font-bold text-lg"
            />
            <Button
              onClick={() => removeCategory(catIndex)}
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {category.items.map((item, itemIndex) => (
              <div key={`item-${catIndex}-${itemIndex}`} className="flex gap-3 items-start p-3 bg-[#28170F] rounded-lg">
                <div className="flex-1 space-y-2">
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(catIndex, itemIndex, "name", e.target.value)}
                    placeholder="Názov"
                    className="bg-transparent border-[#8C6F4E]/50 text-[#F5E3C2]"
                  />
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(catIndex, itemIndex, "description", e.target.value)}
                    placeholder="Popis"
                    className="bg-transparent border-[#8C6F4E]/50 text-[#F5E3C2]/70 text-sm"
                  />
                </div>
                <Input
                  type="number"
                  step="0.1"
                  value={item.price}
                  onChange={(e) => updateItem(catIndex, itemIndex, "price", parseFloat(e.target.value) || 0)}
                  className="w-24 bg-transparent border-[#8C6F4E]/50 text-[#E09E14]"
                />
                <Button
                  onClick={() => removeItem(catIndex, itemIndex)}
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              onClick={() => addItem(catIndex)}
              variant="outline"
              size="sm"
              className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              Pridať položku
            </Button>
          </CardContent>
        </Card>
      ))}

      <Button
        onClick={addCategory}
        variant="outline"
        className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
      >
        <Plus className="h-4 w-4 mr-2" />
        Pridať kategóriu
      </Button>
    </div>
  )
}
