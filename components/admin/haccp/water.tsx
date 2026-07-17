'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HaccpCard, HaccpEmptyState, HaccpModal, HaccpStatusBadge, swrFetcher } from './haccp-utils'
import { Droplets, Plus, Search } from 'lucide-react'

export function WaterPage({ canWrite }: { canWrite: boolean }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    checkDate: new Date().toISOString().slice(0, 10),
    sourceType: 'tap' as string,
    ph: '',
    chlorine: '',
    turbidity: '',
    temperature: '',
    result: 'ok' as 'ok' | 'deviation' | 'critical',
    correctiveAction: '',
    labReport: '',
    notes: '',
  })

  const { data, mutate } = useSWR('/api/admin/haccp/water', swrFetcher)
  const items = (data?.items ?? []).filter((r: Record<string, string>) =>
    !search || r.source_type?.toLowerCase().includes(search.toLowerCase()) || r.notes?.toLowerCase().includes(search.toLowerCase())
  )

  const reset = () => {
    setForm({ checkDate: new Date().toISOString().slice(0, 10), sourceType: 'tap', ph: '', chlorine: '', turbidity: '', temperature: '', result: 'ok', correctiveAction: '', labReport: '', notes: '' })
    setError('')
  }

  const handleSubmit = async () => {
    if (form.ph && isNaN(Number(form.ph))) { setError('pH musí byť číslo.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/haccp/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
          <h1 className="font-heading text-2xl text-[#F5E3C2]">Kontrola vody</h1>
          <p className="text-sm text-[#8C6F4E] mt-0.5">Záznamy o kvalite vody — pH, chlór, zákal</p>
        </div>
        {canWrite && (
          <Button onClick={() => { reset(); setOpen(true) }} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Nová kontrola
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C6F4E]" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať..." className="pl-9 bg-[#3a251a] border-[#8C6F4E]/30 text-[#F5E3C2] placeholder:text-[#8C6F4E]" />
      </div>

      {items.length === 0 ? (
        <HaccpEmptyState icon={<Droplets className="h-10 w-10 text-[#8C6F4E]" />} title="Žiadne záznamy" description={search ? 'Skúste iný výraz.' : 'Zatiaľ nebola pridaná žiadna kontrola vody.'} />
      ) : (
        <div className="space-y-3">
          {items.map((r: Record<string, string>) => (
            <HaccpCard key={r.id}>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[#8C6F4E]">{r.check_date ? new Date(r.check_date).toLocaleDateString('sk-SK') : '—'}</span>
                    <HaccpStatusBadge result={r.result as 'ok' | 'deviation' | 'critical'} />
                    <span className="text-xs text-[#8C6F4E]">{r.source_type}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-0.5">
                    {r.ph != null && <span className="text-xs text-[#F5E3C2]">pH: <strong>{r.ph}</strong></span>}
                    {r.chlorine != null && <span className="text-xs text-[#F5E3C2]">Cl: <strong>{r.chlorine} mg/l</strong></span>}
                    {r.turbidity != null && <span className="text-xs text-[#F5E3C2]">Zákal: <strong>{r.turbidity} NTU</strong></span>}
                    {r.temperature != null && <span className="text-xs text-[#F5E3C2]">T: <strong>{r.temperature} °C</strong></span>}
                  </div>
                  {r.lab_report && <p className="text-xs text-[#8C6F4E]">Lab: {r.lab_report}</p>}
                </div>
                <span className="text-xs text-[#8C6F4E] shrink-0">{r.performed_by_name ?? '—'}</span>
              </div>
            </HaccpCard>
          ))}
        </div>
      )}

      <HaccpModal open={open} onOpenChange={setOpen} title="Nová kontrola vody" error={error} onSubmit={handleSubmit} saving={saving}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Dátum</label>
            <Input type="date" value={form.checkDate} onChange={e => setForm(f => ({ ...f, checkDate: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Zdroj vody</label>
            <Select value={form.sourceType} onValueChange={v => setForm(f => ({ ...f, sourceType: v }))}>
              <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tap">Vodovod</SelectItem>
                <SelectItem value="well">Studňa</SelectItem>
                <SelectItem value="filtered">Filtrovaná</SelectItem>
                <SelectItem value="other">Iné</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[['ph', 'pH'], ['chlorine', 'Chlór (mg/l)'], ['turbidity', 'Zákal (NTU)'], ['temperature', 'Teplota (°C)']].map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <label className="text-xs text-[#8C6F4E]">{label}</label>
              <Input type="number" step="0.01" value={form[key as keyof typeof form] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Výsledok</label>
          <Select value={form.result} onValueChange={v => setForm(f => ({ ...f, result: v as typeof form.result }))}>
            <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ok">V poriadku</SelectItem>
              <SelectItem value="deviation">Odchýlka</SelectItem>
              <SelectItem value="critical">Kritická odchýlka</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.result !== 'ok' && (
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Nápravné opatrenie</label>
            <Textarea value={form.correctiveAction} onChange={e => setForm(f => ({ ...f, correctiveAction: e.target.value }))} rows={2} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Číslo lab. protokolu</label>
          <Input value={form.labReport} onChange={e => setForm(f => ({ ...f, labReport: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" placeholder="voliteľné" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Poznámky</label>
          <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
      </HaccpModal>
    </div>
  )
}
