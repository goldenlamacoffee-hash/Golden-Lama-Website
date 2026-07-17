'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HaccpCard, HaccpEmptyState, HaccpModal, HaccpStatusBadge, swrFetcher } from './haccp-utils'
import { ShowerHead, Plus, Search } from 'lucide-react'

const FREQUENCIES = ['Denná', 'Týždenná', 'Mesačná', 'Po potrebe']

export function SanitationPage({ canWrite }: { canWrite: boolean }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    sanitationDate: new Date().toISOString().slice(0, 10),
    area: '',
    cleaningAgent: '',
    concentration: '',
    contactTime: '',
    frequency: 'Denná',
    result: 'ok' as 'ok' | 'deviation' | 'critical',
    deviation: '',
    correctiveAction: '',
    notes: '',
  })

  const { data, mutate } = useSWR('/api/admin/haccp/sanitation', swrFetcher)
  const items = (data?.items ?? []).filter((r: Record<string, string>) =>
    !search || r.area?.toLowerCase().includes(search.toLowerCase())
  )

  const reset = () => {
    setForm({ sanitationDate: new Date().toISOString().slice(0, 10), area: '', cleaningAgent: '', concentration: '', contactTime: '', frequency: 'Denná', result: 'ok', deviation: '', correctiveAction: '', notes: '' })
    setError('')
  }

  const handleSubmit = async () => {
    if (!form.area.trim()) { setError('Zadajte oblasť/miesto sanitácie.'); return }
    if (!form.cleaningAgent.trim()) { setError('Zadajte čistiaci prostriedok.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/haccp/sanitation', {
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
          <h1 className="font-heading text-2xl text-[#F5E3C2]">Sanitácia</h1>
          <p className="text-sm text-[#8C6F4E] mt-0.5">Záznamy o čistení a dezinfekcii priestorov a zariadení</p>
        </div>
        {canWrite && (
          <Button onClick={() => { reset(); setOpen(true) }} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Nový záznam
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C6F4E]" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať oblasť..." className="pl-9 bg-[#3a251a] border-[#8C6F4E]/30 text-[#F5E3C2] placeholder:text-[#8C6F4E]" />
      </div>

      {items.length === 0 ? (
        <HaccpEmptyState icon={<ShowerHead className="h-10 w-10 text-[#8C6F4E]" />} title="Žiadne záznamy" description={search ? 'Skúste iný výraz.' : 'Zatiaľ nebol pridaný žiadny sanitačný záznam.'} />
      ) : (
        <div className="space-y-3">
          {items.map((r: Record<string, string>) => (
            <HaccpCard key={r.id}>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[#8C6F4E]">{r.sanitation_date ? new Date(r.sanitation_date).toLocaleDateString('sk-SK') : '—'}</span>
                    <HaccpStatusBadge result={r.result as 'ok' | 'deviation' | 'critical'} />
                    <span className="text-xs text-[#8C6F4E]">{r.frequency}</span>
                  </div>
                  <p className="text-sm text-[#F5E3C2] font-medium">{r.area}</p>
                  <p className="text-xs text-[#8C6F4E]">{r.cleaning_agent}{r.concentration ? ` — ${r.concentration}` : ''}{r.contact_time ? ` — ${r.contact_time} min` : ''}</p>
                  {r.deviation && <p className="text-xs text-amber-400">{r.deviation}</p>}
                </div>
                <span className="text-xs text-[#8C6F4E] shrink-0">{r.performed_by_name ?? '—'}</span>
              </div>
            </HaccpCard>
          ))}
        </div>
      )}

      <HaccpModal open={open} onOpenChange={setOpen} title="Nový sanitačný záznam" error={error} onSubmit={handleSubmit} saving={saving}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Dátum</label>
            <Input type="date" value={form.sanitationDate} onChange={e => setForm(f => ({ ...f, sanitationDate: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Frekvencia</label>
            <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
              <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
              <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Oblasť / miesto *</label>
          <Input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" placeholder="napr. Pracovná plocha, chladnička..." />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5 col-span-1 sm:col-span-1">
            <label className="text-xs text-[#8C6F4E]">Čistiaci prostriedok *</label>
            <Input value={form.cleaningAgent} onChange={e => setForm(f => ({ ...f, cleaningAgent: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Koncentrácia</label>
            <Input value={form.concentration} onChange={e => setForm(f => ({ ...f, concentration: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" placeholder="napr. 0.5%" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Čas kontaktu (min)</label>
            <Input type="number" value={form.contactTime} onChange={e => setForm(f => ({ ...f, contactTime: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
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
          <>
            <div className="space-y-1.5">
              <label className="text-xs text-[#8C6F4E]">Popis odchýlky</label>
              <Textarea value={form.deviation} onChange={e => setForm(f => ({ ...f, deviation: e.target.value }))} rows={2} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[#8C6F4E]">Nápravné opatrenie</label>
              <Textarea value={form.correctiveAction} onChange={e => setForm(f => ({ ...f, correctiveAction: e.target.value }))} rows={2} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
            </div>
          </>
        )}
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Poznámky</label>
          <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
      </HaccpModal>
    </div>
  )
}
