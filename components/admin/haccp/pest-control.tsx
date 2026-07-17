'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HaccpCard, HaccpEmptyState, HaccpModal, swrFetcher } from './haccp-utils'
import { Bug, Plus, Search } from 'lucide-react'

const PEST_TYPES = ['Myši / potkany', 'Hmyz lietajúci', 'Hmyz lezúci', 'Vtáky', 'Iné']
const INSPECTION_TYPES = ['Preventívna prehliadka', 'Ošetrenie', 'Monitoring', 'Havárijný zásah']

export function PestControlPage({ canWrite }: { canWrite: boolean }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    inspectionDate: new Date().toISOString().slice(0, 10),
    inspectionType: 'Preventívna prehliadka',
    contractor: '',
    areasInspected: '',
    findings: '',
    pestType: '',
    treatmentApplied: '',
    chemicalsUsed: '',
    nextInspectionDate: '',
    result: 'ok' as 'ok' | 'deviation' | 'critical',
    notes: '',
  })

  const { data, mutate } = useSWR('/api/admin/haccp/pest-control', swrFetcher)
  const items = (data?.items ?? []).filter((r: Record<string, string>) =>
    !search || r.inspection_type?.toLowerCase().includes(search.toLowerCase()) || r.contractor?.toLowerCase().includes(search.toLowerCase())
  )

  const reset = () => {
    setForm({ inspectionDate: new Date().toISOString().slice(0, 10), inspectionType: 'Preventívna prehliadka', contractor: '', areasInspected: '', findings: '', pestType: '', treatmentApplied: '', chemicalsUsed: '', nextInspectionDate: '', result: 'ok', notes: '' })
    setError('')
  }

  const handleSubmit = async () => {
    if (!form.areasInspected.trim()) { setError('Zadajte kontrolované oblasti.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/haccp/pest-control', {
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
          <h1 className="font-heading text-2xl text-[#F5E3C2]">Deratizácia / DDD</h1>
          <p className="text-sm text-[#8C6F4E] mt-0.5">Záznamy o kontrole a likvidácii škodcov</p>
        </div>
        {canWrite && (
          <Button onClick={() => { reset(); setOpen(true) }} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Nový záznam
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C6F4E]" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať..." className="pl-9 bg-[#3a251a] border-[#8C6F4E]/30 text-[#F5E3C2] placeholder:text-[#8C6F4E]" />
      </div>

      {items.length === 0 ? (
        <HaccpEmptyState icon={<Bug className="h-10 w-10 text-[#8C6F4E]" />} title="Žiadne záznamy" description={search ? 'Skúste iný výraz.' : 'Zatiaľ nebol pridaný žiadny DDD záznam.'} />
      ) : (
        <div className="space-y-3">
          {items.map((r: Record<string, string>) => (
            <HaccpCard key={r.id}>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[#8C6F4E]">{r.inspection_date ? new Date(r.inspection_date).toLocaleDateString('sk-SK') : '—'}</span>
                    <Badge className="bg-[#E09E14]/10 text-[#E09E14] border-0 text-xs">{r.inspection_type}</Badge>
                    {r.result === 'ok' ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">Bez nálezu</Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">Nález</Badge>
                    )}
                  </div>
                  <p className="text-sm text-[#F5E3C2]">{r.areas_inspected}</p>
                  {r.contractor && <p className="text-xs text-[#8C6F4E]">Firma: {r.contractor}</p>}
                  {r.findings && <p className="text-xs text-amber-400">{r.findings}</p>}
                  {r.next_inspection_date && <p className="text-xs text-[#8C6F4E]">Ďalšia: {new Date(r.next_inspection_date).toLocaleDateString('sk-SK')}</p>}
                </div>
                <span className="text-xs text-[#8C6F4E] shrink-0">{r.performed_by_name ?? '—'}</span>
              </div>
            </HaccpCard>
          ))}
        </div>
      )}

      <HaccpModal open={open} onOpenChange={setOpen} title="DDD záznam" error={error} onSubmit={handleSubmit} saving={saving}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Dátum</label>
            <Input type="date" value={form.inspectionDate} onChange={e => setForm(f => ({ ...f, inspectionDate: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Typ</label>
            <Select value={form.inspectionType} onValueChange={v => setForm(f => ({ ...f, inspectionType: v }))}>
              <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
              <SelectContent>{INSPECTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Firma / pracovník DDD</label>
          <Input value={form.contractor} onChange={e => setForm(f => ({ ...f, contractor: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Kontrolované oblasti *</label>
          <Textarea value={form.areasInspected} onChange={e => setForm(f => ({ ...f, areasInspected: e.target.value }))} rows={2} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Výsledok</label>
          <Select value={form.result} onValueChange={v => setForm(f => ({ ...f, result: v as typeof form.result }))}>
            <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ok">Bez nálezu</SelectItem>
              <SelectItem value="deviation">Nález — ošetrený</SelectItem>
              <SelectItem value="critical">Aktívny výskyt</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.result !== 'ok' && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs text-[#8C6F4E]">Typ škodcu</label>
              <Select value={form.pestType} onValueChange={v => setForm(f => ({ ...f, pestType: v }))}>
                <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue placeholder="Vybrať..." /></SelectTrigger>
                <SelectContent>{PEST_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[#8C6F4E]">Nález / popis</label>
              <Textarea value={form.findings} onChange={e => setForm(f => ({ ...f, findings: e.target.value }))} rows={2} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[#8C6F4E]">Použité chemikálie / prostriedky</label>
              <Input value={form.chemicalsUsed} onChange={e => setForm(f => ({ ...f, chemicalsUsed: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[#8C6F4E]">Vykonané ošetrenie</label>
              <Textarea value={form.treatmentApplied} onChange={e => setForm(f => ({ ...f, treatmentApplied: e.target.value }))} rows={2} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
            </div>
          </>
        )}
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Dátum nasledujúcej kontroly</label>
          <Input type="date" value={form.nextInspectionDate} onChange={e => setForm(f => ({ ...f, nextInspectionDate: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Poznámky</label>
          <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
      </HaccpModal>
    </div>
  )
}
