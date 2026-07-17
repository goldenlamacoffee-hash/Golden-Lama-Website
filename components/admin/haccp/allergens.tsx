'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { HaccpCard, HaccpEmptyState, HaccpModal, swrFetcher } from './haccp-utils'
import { AlertCircle, Plus, Search } from 'lucide-react'

const EU_ALLERGENS = [
  'Lepok (pšenica, raž, jačmeň, ovos)',
  'Kôrovce',
  'Vajcia',
  'Ryby',
  'Arašidy',
  'Sója',
  'Mlieko a laktóza',
  'Orechy (mandle, vlašské, lieskové, kešu, pekanové, brazílske, pistácie, macadamia)',
  'Zeler',
  'Horčica',
  'Sezam',
  'Oxid siričitý a siričitany (>10mg/kg)',
  'Vlčí bôb',
  'Mäkkýše',
]

export function AllergensPage({ canWrite }: { canWrite: boolean }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    productName: '',
    allergenList: [] as string[],
    crossContaminationRisk: '',
    handlingProcedure: '',
    lastReviewed: new Date().toISOString().slice(0, 10),
    notes: '',
  })

  const { data, mutate } = useSWR('/api/admin/haccp/allergens', swrFetcher)
  const items = (data?.items ?? []).filter((r: Record<string, string>) =>
    !search || r.product_name?.toLowerCase().includes(search.toLowerCase())
  )

  const reset = () => {
    setForm({ productName: '', allergenList: [], crossContaminationRisk: '', handlingProcedure: '', lastReviewed: new Date().toISOString().slice(0, 10), notes: '' })
    setError('')
  }

  const toggleAllergen = (a: string) =>
    setForm(f => ({ ...f, allergenList: f.allergenList.includes(a) ? f.allergenList.filter(x => x !== a) : [...f.allergenList, a] }))

  const handleSubmit = async () => {
    if (!form.productName.trim()) { setError('Zadajte názov produktu / nápoja.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/haccp/allergens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, allergenList: form.allergenList.join(', ') }) })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Chyba') }
      await mutate(); setOpen(false); reset()
    } catch (e) { setError(e instanceof Error ? e.message : 'Chyba') } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-[#F5E3C2]">Alergény</h1>
          <p className="text-sm text-[#8C6F4E] mt-0.5">Správa alergénov produktov podľa nariadenia EÚ č. 1169/2011</p>
        </div>
        {canWrite && (
          <Button onClick={() => { reset(); setOpen(true) }} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Nový produkt
          </Button>
        )}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C6F4E]" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať produkt..." className="pl-9 bg-[#3a251a] border-[#8C6F4E]/30 text-[#F5E3C2] placeholder:text-[#8C6F4E]" />
      </div>
      {items.length === 0 ? (
        <HaccpEmptyState icon={<AlertCircle className="h-10 w-10 text-[#8C6F4E]" />} title="Žiadne záznamy" description={search ? 'Skúste iný výraz.' : 'Zatiaľ nebol pridaný žiadny produkt s alergénmi.'} />
      ) : (
        <div className="space-y-3">
          {items.map((r: Record<string, string>) => {
            const allergens = r.allergen_list ? r.allergen_list.split(',').map((a: string) => a.trim()).filter(Boolean) : []
            return (
              <HaccpCard key={r.id}>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[#F5E3C2] font-medium">{r.product_name}</p>
                    <span className="text-xs text-[#8C6F4E]">Rev: {r.last_reviewed ? new Date(r.last_reviewed).toLocaleDateString('sk-SK') : '—'}</span>
                  </div>
                  {allergens.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {allergens.map((a: string) => (
                        <Badge key={a} className="bg-red-500/20 text-red-400 border-0 text-xs">{a}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-400">Bez alergénov</p>
                  )}
                  {r.cross_contamination_risk && <p className="text-xs text-amber-400">Riziko kontaminácie: {r.cross_contamination_risk}</p>}
                </div>
              </HaccpCard>
            )
          })}
        </div>
      )}
      <HaccpModal open={open} onOpenChange={setOpen} title="Alergény produktu" error={error} onSubmit={handleSubmit} saving={saving}>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Názov produktu / nápoja *</label>
          <Input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-[#8C6F4E]">Alergény (zaškrtnite obsahované)</label>
          <div className="grid grid-cols-1 gap-1.5 max-h-52 overflow-y-auto pr-1">
            {EU_ALLERGENS.map(a => (
              <label key={a} className="flex items-center gap-2 text-xs text-[#F5E3C2] cursor-pointer rounded px-2 py-1 hover:bg-[#3a251a]">
                <input type="checkbox" checked={form.allergenList.includes(a)} onChange={() => toggleAllergen(a)} className="rounded border-[#8C6F4E]/30 accent-[#E09E14]" />
                {a}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Riziko krížovej kontaminácie</label>
          <Input value={form.crossContaminationRisk} onChange={e => setForm(f => ({ ...f, crossContaminationRisk: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" placeholder="napr. Stopy orechov možné" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Postup pri zaobchádzaní</label>
          <Textarea value={form.handlingProcedure} onChange={e => setForm(f => ({ ...f, handlingProcedure: e.target.value }))} rows={2} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Dátum poslednej revízie</label>
          <Input type="date" value={form.lastReviewed} onChange={e => setForm(f => ({ ...f, lastReviewed: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
      </HaccpModal>
    </div>
  )
}
