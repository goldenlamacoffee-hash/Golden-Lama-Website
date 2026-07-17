'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HaccpCard, HaccpEmptyState, HaccpModal, HaccpStatusBadge, swrFetcher } from './haccp-utils'
import { Thermometer, Plus, Search, AlertTriangle } from 'lucide-react'

export function TemperaturesPage({ canWrite }: { canWrite: boolean }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    measuredAt: new Date().toISOString().slice(0, 16),
    equipmentId: '',
    equipmentName: '',
    temperatureValue: '',
    minLimit: '',
    maxLimit: '',
    measurementType: 'fridge' as string,
    result: 'ok' as 'ok' | 'deviation' | 'critical',
    correctiveAction: '',
    notes: '',
  })

  const { data: settingsData } = useSWR('/api/admin/haccp/settings', swrFetcher)
  const equipment = settingsData?.settings?.equipment ?? []
  const { data, mutate } = useSWR('/api/admin/haccp/temperatures', swrFetcher)
  const items = (data?.items ?? []).filter((r: Record<string, string>) =>
    !search || r.equipment_name?.toLowerCase().includes(search.toLowerCase())
  )

  const reset = () => {
    setForm({ measuredAt: new Date().toISOString().slice(0, 16), equipmentId: '', equipmentName: '', temperatureValue: '', minLimit: '', maxLimit: '', measurementType: 'fridge', result: 'ok', correctiveAction: '', notes: '' })
    setError('')
  }

  const handleEquipmentSelect = (id: string) => {
    const eq = equipment.find((e: Record<string, string>) => e.id === id)
    if (eq) {
      setForm(f => ({ ...f, equipmentId: id, equipmentName: eq.name, minLimit: String(eq.min_temp ?? ''), maxLimit: String(eq.max_temp ?? ''), measurementType: eq.type ?? 'fridge' }))
    }
  }

  const handleSubmit = async () => {
    if (!form.equipmentName.trim()) { setError('Zadajte zariadenie.'); return }
    if (!form.temperatureValue || isNaN(Number(form.temperatureValue))) { setError('Zadajte platnú teplotu.'); return }
    const temp = Number(form.temperatureValue)
    const autoResult = (form.minLimit || form.maxLimit)
      ? (temp < Number(form.minLimit ?? -999) || temp > Number(form.maxLimit ?? 999)) ? 'deviation' : 'ok'
      : form.result
    setSaving(true)
    try {
      const res = await fetch('/api/admin/haccp/temperatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, result: autoResult }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Chyba') }
      await mutate()
      setOpen(false)
      reset()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-[#F5E3C2]">Teplotné záznamy</h1>
          <p className="text-sm text-[#8C6F4E] mt-0.5">Meranie teplôt chladničiek, mrazákov a iných zariadení</p>
        </div>
        {canWrite && (
          <Button onClick={() => { reset(); setOpen(true) }} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Nové meranie
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C6F4E]" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať zariadenie..." className="pl-9 bg-[#3a251a] border-[#8C6F4E]/30 text-[#F5E3C2] placeholder:text-[#8C6F4E]" />
      </div>

      {items.length === 0 ? (
        <HaccpEmptyState icon={<Thermometer className="h-10 w-10 text-[#8C6F4E]" />} title="Žiadne záznamy" description={search ? 'Skúste iný výraz.' : 'Zatiaľ nebolo pridané žiadne meranie teploty.'} />
      ) : (
        <div className="space-y-3">
          {items.map((r: Record<string, string>) => (
            <HaccpCard key={r.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[#8C6F4E]">{r.measured_at ? new Date(r.measured_at).toLocaleString('sk-SK') : '—'}</span>
                    <HaccpStatusBadge result={r.result as 'ok' | 'deviation' | 'critical'} />
                  </div>
                  <p className="text-sm text-[#F5E3C2] font-medium">{r.equipment_name}</p>
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold font-mono ${r.result !== 'ok' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {r.temperature_value != null ? `${r.temperature_value} °C` : '—'}
                    </span>
                    {(r.min_limit != null || r.max_limit != null) && (
                      <span className="text-xs text-[#8C6F4E]">Limit: {r.min_limit ?? '?'} – {r.max_limit ?? '?'} °C</span>
                    )}
                  </div>
                  {r.result !== 'ok' && r.corrective_action && (
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-400">{r.corrective_action}</p>
                    </div>
                  )}
                </div>
                <Badge className="bg-[#E09E14]/10 text-[#E09E14] border-0 text-xs self-start sm:self-center">{r.measurement_type}</Badge>
              </div>
            </HaccpCard>
          ))}
        </div>
      )}

      <HaccpModal open={open} onOpenChange={setOpen} title="Nové meranie teploty" error={error} onSubmit={handleSubmit} saving={saving}>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Čas merania</label>
          <Input type="datetime-local" value={form.measuredAt} onChange={e => setForm(f => ({ ...f, measuredAt: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        {equipment.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Zariadenie (z evidencie)</label>
            <Select onValueChange={handleEquipmentSelect}>
              <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue placeholder="Vybrať zariadenie..." /></SelectTrigger>
              <SelectContent>{equipment.map((e: Record<string, string>) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Názov zariadenia *</label>
          <Input value={form.equipmentName} onChange={e => setForm(f => ({ ...f, equipmentName: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" placeholder="napr. Chladnička č.1" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Teplota (°C) *</label>
            <Input type="number" step="0.1" value={form.temperatureValue} onChange={e => setForm(f => ({ ...f, temperatureValue: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Min limit</label>
            <Input type="number" step="0.1" value={form.minLimit} onChange={e => setForm(f => ({ ...f, minLimit: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Max limit</label>
            <Input type="number" step="0.1" value={form.maxLimit} onChange={e => setForm(f => ({ ...f, maxLimit: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Typ merania</label>
          <Select value={form.measurementType} onValueChange={v => setForm(f => ({ ...f, measurementType: v }))}>
            <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fridge">Chladnička</SelectItem>
              <SelectItem value="freezer">Mrazák</SelectItem>
              <SelectItem value="ambient">Teplota prostredia</SelectItem>
              <SelectItem value="food">Teplota jedla</SelectItem>
              <SelectItem value="other">Iné</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Nápravné opatrenie (ak mimo limitu)</label>
          <Textarea value={form.correctiveAction} onChange={e => setForm(f => ({ ...f, correctiveAction: e.target.value }))} rows={2} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Poznámky</label>
          <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
      </HaccpModal>
    </div>
  )
}
