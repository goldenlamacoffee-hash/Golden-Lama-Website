'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HaccpCard, HaccpEmptyState, HaccpModal, swrFetcher } from './haccp-utils'
import { AlertOctagon, Plus, Search } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-emerald-500/20 text-emerald-400',
  medium: 'bg-amber-500/20 text-amber-400',
  high: 'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
}
const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-500/20 text-red-400',
  in_progress: 'bg-amber-500/20 text-amber-400',
  closed: 'bg-emerald-500/20 text-emerald-400',
}

export function NonConformitiesPage({ canWrite }: { canWrite: boolean }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    detectedAt: new Date().toISOString().slice(0, 10),
    category: 'Produkt',
    severity: 'medium' as string,
    description: '',
    affectedProduct: '',
    rootCause: '',
    correctiveAction: '',
    preventiveAction: '',
    dueDate: '',
    status: 'open' as string,
    notes: '',
  })

  const { data, mutate } = useSWR('/api/admin/haccp/non-conformities', swrFetcher)
  const items = (data?.items ?? []).filter((r: Record<string, string>) =>
    !search || r.description?.toLowerCase().includes(search.toLowerCase()) || r.category?.toLowerCase().includes(search.toLowerCase())
  )

  const reset = () => {
    setForm({ detectedAt: new Date().toISOString().slice(0, 10), category: 'Produkt', severity: 'medium', description: '', affectedProduct: '', rootCause: '', correctiveAction: '', preventiveAction: '', dueDate: '', status: 'open', notes: '' })
    setError('')
  }

  const handleSubmit = async () => {
    if (!form.description.trim()) { setError('Zadajte popis nezhody.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/haccp/non-conformities', {
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
          <h1 className="font-heading text-2xl text-[#F5E3C2]">Nezhody</h1>
          <p className="text-sm text-[#8C6F4E] mt-0.5">Záznamy o nezhodách, nápravných a preventívnych opatreniach</p>
        </div>
        {canWrite && (
          <Button onClick={() => { reset(); setOpen(true) }} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Nová nezhoda
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C6F4E]" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať..." className="pl-9 bg-[#3a251a] border-[#8C6F4E]/30 text-[#F5E3C2] placeholder:text-[#8C6F4E]" />
      </div>

      {items.length === 0 ? (
        <HaccpEmptyState icon={<AlertOctagon className="h-10 w-10 text-[#8C6F4E]" />} title="Žiadne záznamy" description={search ? 'Skúste iný výraz.' : 'Žiadna nezhoda nebola zaznamenaná.'} />
      ) : (
        <div className="space-y-3">
          {items.map((r: Record<string, string>) => (
            <HaccpCard key={r.id}>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[#8C6F4E]">{r.detected_at ? new Date(r.detected_at).toLocaleDateString('sk-SK') : '—'}</span>
                    <Badge className={`border-0 text-xs ${SEVERITY_COLORS[r.severity] ?? 'bg-[#8C6F4E]/20 text-[#8C6F4E]'}`}>{r.severity}</Badge>
                    <Badge className={`border-0 text-xs ${STATUS_COLORS[r.status] ?? 'bg-[#8C6F4E]/20 text-[#8C6F4E]'}`}>{r.status?.replace('_', ' ')}</Badge>
                    <span className="text-xs text-[#8C6F4E]">{r.category}</span>
                  </div>
                  <p className="text-sm text-[#F5E3C2] font-medium">{r.description}</p>
                  {r.affected_product && <p className="text-xs text-[#8C6F4E]">Produkt: {r.affected_product}</p>}
                  {r.corrective_action && <p className="text-xs text-[#8C6F4E]">Náprava: {r.corrective_action}</p>}
                  {r.due_date && <p className="text-xs text-[#8C6F4E]">Termín: {new Date(r.due_date).toLocaleDateString('sk-SK')}</p>}
                </div>
                <span className="text-xs text-[#8C6F4E] shrink-0">{r.detected_by_name ?? '—'}</span>
              </div>
            </HaccpCard>
          ))}
        </div>
      )}

      <HaccpModal open={open} onOpenChange={setOpen} title="Nová nezhoda" error={error} onSubmit={handleSubmit} saving={saving}>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Dátum zistenia</label>
            <Input type="date" value={form.detectedAt} onChange={e => setForm(f => ({ ...f, detectedAt: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Kategória</label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
              <SelectContent>{['Produkt', 'Proces', 'Zariadenie', 'Zamestnanci', 'Dodávateľ', 'Iné'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Závažnosť</label>
            <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
              <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Nízka</SelectItem>
                <SelectItem value="medium">Stredná</SelectItem>
                <SelectItem value="high">Vysoká</SelectItem>
                <SelectItem value="critical">Kritická</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Popis nezhody *</label>
          <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Dotknutý produkt / oblasť</label>
          <Input value={form.affectedProduct} onChange={e => setForm(f => ({ ...f, affectedProduct: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Príčina</label>
          <Textarea value={form.rootCause} onChange={e => setForm(f => ({ ...f, rootCause: e.target.value }))} rows={2} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Nápravné opatrenie</label>
          <Textarea value={form.correctiveAction} onChange={e => setForm(f => ({ ...f, correctiveAction: e.target.value }))} rows={2} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Preventívne opatrenie</label>
          <Textarea value={form.preventiveAction} onChange={e => setForm(f => ({ ...f, preventiveAction: e.target.value }))} rows={2} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Termín uzavretia</label>
            <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Stav</label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Otvorená</SelectItem>
                <SelectItem value="in_progress">V riešení</SelectItem>
                <SelectItem value="closed">Uzavretá</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </HaccpModal>
    </div>
  )
}
