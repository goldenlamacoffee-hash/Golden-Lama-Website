'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { swrFetcher } from './haccp-utils'
import { Save, Loader2, Plus, Trash2 } from 'lucide-react'

interface Equipment { id: string; name: string; type: string; min_temp: number | null; max_temp: number | null }
interface SupplierRef { id: string; name: string }

export function SettingsPage({ canWrite }: { canWrite: boolean }) {
  const { data, mutate } = useSWR('/api/admin/haccp/settings', swrFetcher)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [business, setBusiness] = useState({ name: '', address: '', ico: '', responsible_person: '', veterinary_number: '', haccp_consultant: '' })
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [suppliers, setSuppliers] = useState<SupplierRef[]>([])

  useEffect(() => {
    if (data?.settings) {
      const s = data.settings
      setBusiness({
        name: s.business_name ?? '',
        address: s.business_address ?? '',
        ico: s.ico ?? '',
        responsible_person: s.responsible_person ?? '',
        veterinary_number: s.veterinary_number ?? '',
        haccp_consultant: s.haccp_consultant ?? '',
      })
      setEquipment(s.equipment ?? [])
      setSuppliers(s.suppliers ?? [])
    }
  }, [data])

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/admin/haccp/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business, equipment, suppliers }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Chyba') }
      await mutate(); setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch (e) { setError(e instanceof Error ? e.message : 'Chyba') } finally { setSaving(false) }
  }

  const addEquipment = () => setEquipment(eq => [...eq, { id: crypto.randomUUID(), name: '', type: 'fridge', min_temp: null, max_temp: null }])
  const removeEquipment = (id: string) => setEquipment(eq => eq.filter(e => e.id !== id))
  const addSupplier = () => setSuppliers(s => [...s, { id: crypto.randomUUID(), name: '' }])
  const removeSupplier = (id: string) => setSuppliers(s => s.filter(x => x.id !== id))

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-[#F5E3C2]">Nastavenia HACCP</h1>
          <p className="text-sm text-[#8C6F4E] mt-0.5">Základné údaje prevádzky a konfigurácia zariadení</p>
        </div>
        {canWrite && (
          <Button onClick={handleSave} disabled={saving} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Ukladám...</> : <><Save className="h-4 w-4 mr-2" />Uložiť</>}
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {saved && <p className="text-sm text-emerald-400">Nastavenia boli uložené.</p>}

      {/* Business info */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-[#E09E14] uppercase tracking-wider">Údaje prevádzky</h2>
        <div className="rounded-xl border border-[#8C6F4E]/20 bg-[#3a251a]/60 p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-[#8C6F4E]">Názov prevádzky</label>
              <Input value={business.name} onChange={e => setBusiness(b => ({ ...b, name: e.target.value }))} disabled={!canWrite} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2] disabled:opacity-60" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[#8C6F4E]">IČO</label>
              <Input value={business.ico} onChange={e => setBusiness(b => ({ ...b, ico: e.target.value }))} disabled={!canWrite} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2] disabled:opacity-60" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Adresa prevádzky</label>
            <Input value={business.address} onChange={e => setBusiness(b => ({ ...b, address: e.target.value }))} disabled={!canWrite} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2] disabled:opacity-60" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-[#8C6F4E]">Zodpovedná osoba (HACCP tím)</label>
              <Input value={business.responsible_person} onChange={e => setBusiness(b => ({ ...b, responsible_person: e.target.value }))} disabled={!canWrite} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2] disabled:opacity-60" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[#8C6F4E]">Číslo veterinárneho schválenia</label>
              <Input value={business.veterinary_number} onChange={e => setBusiness(b => ({ ...b, veterinary_number: e.target.value }))} disabled={!canWrite} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2] disabled:opacity-60" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">HACCP konzultant / externá firma</label>
            <Input value={business.haccp_consultant} onChange={e => setBusiness(b => ({ ...b, haccp_consultant: e.target.value }))} disabled={!canWrite} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2] disabled:opacity-60" />
          </div>
        </div>
      </section>

      {/* Equipment */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#E09E14] uppercase tracking-wider">Zariadenia pre meranie teplôt</h2>
          {canWrite && (
            <Button variant="outline" size="sm" onClick={addEquipment} className="border-[#8C6F4E]/30 text-[#F5E3C2] hover:bg-[#3a251a]">
              <Plus className="h-3.5 w-3.5 mr-1" /> Pridať
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {equipment.length === 0 && <p className="text-xs text-[#8C6F4E] italic">Žiadne zariadenia. Pridajte chladničky, mrazáky atď.</p>}
          {equipment.map((eq) => (
            <div key={eq.id} className="rounded-lg border border-[#8C6F4E]/20 bg-[#3a251a]/60 p-4">
              <div className="grid sm:grid-cols-5 gap-3 items-end">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs text-[#8C6F4E]">Názov zariadenia</label>
                  <Input value={eq.name} onChange={e => setEquipment(eqs => eqs.map(x => x.id === eq.id ? { ...x, name: e.target.value } : x))} disabled={!canWrite} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2] disabled:opacity-60" placeholder="napr. Chladnička č.1" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-[#8C6F4E]">Typ</label>
                  <select value={eq.type} onChange={e => setEquipment(eqs => eqs.map(x => x.id === eq.id ? { ...x, type: e.target.value } : x))} disabled={!canWrite} className="w-full rounded-md bg-[#28170F] border border-[#8C6F4E]/30 text-[#F5E3C2] text-sm px-2 py-2 disabled:opacity-60">
                    <option value="fridge">Chladnička</option>
                    <option value="freezer">Mrazák</option>
                    <option value="ambient">Ambient</option>
                    <option value="other">Iné</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#8C6F4E]">Min °C</label>
                    <Input type="number" value={eq.min_temp ?? ''} onChange={e => setEquipment(eqs => eqs.map(x => x.id === eq.id ? { ...x, min_temp: e.target.value ? Number(e.target.value) : null } : x))} disabled={!canWrite} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2] disabled:opacity-60" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#8C6F4E]">Max °C</label>
                    <Input type="number" value={eq.max_temp ?? ''} onChange={e => setEquipment(eqs => eqs.map(x => x.id === eq.id ? { ...x, max_temp: e.target.value ? Number(e.target.value) : null } : x))} disabled={!canWrite} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2] disabled:opacity-60" />
                  </div>
                </div>
                {canWrite && (
                  <Button variant="ghost" size="icon" onClick={() => removeEquipment(eq.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 self-end">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick supplier refs */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#E09E14] uppercase tracking-wider">Rýchly zoznam dodávateľov (pre výber v príjme)</h2>
          {canWrite && (
            <Button variant="outline" size="sm" onClick={addSupplier} className="border-[#8C6F4E]/30 text-[#F5E3C2] hover:bg-[#3a251a]">
              <Plus className="h-3.5 w-3.5 mr-1" /> Pridať
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {suppliers.length === 0 && <p className="text-xs text-[#8C6F4E] italic">Žiadni dodávatelia v zozname.</p>}
          {suppliers.map((s) => (
            <div key={s.id} className="flex items-center gap-3">
              <Input value={s.name} onChange={e => setSuppliers(ss => ss.map(x => x.id === s.id ? { ...x, name: e.target.value } : x))} disabled={!canWrite} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2] disabled:opacity-60 flex-1" placeholder="Názov dodávateľa" />
              {canWrite && (
                <Button variant="ghost" size="icon" onClick={() => removeSupplier(s.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
