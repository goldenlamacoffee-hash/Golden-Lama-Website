'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HaccpCard, HaccpEmptyState, HaccpModal, swrFetcher } from './haccp-utils'
import { Wrench, Plus, Search } from 'lucide-react'

const MAINTENANCE_TYPES = ['Preventívna', 'Opravná', 'Kalibrácia', 'Revízia', 'Iná']
const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  open: { label: 'Otvorená', cls: 'bg-amber-500/20 text-amber-400' },
  in_progress: { label: 'V riešení', cls: 'bg-blue-500/20 text-blue-400' },
  completed: { label: 'Dokončená', cls: 'bg-emerald-500/20 text-emerald-400' },
}

export function MaintenancePage({ canWrite }: { canWrite: boolean }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    reportedAt: new Date().toISOString().slice(0, 10),
    equipmentName: '',
    maintenanceType: 'Opravná',
    issue: '',
    actionTaken: '',
    technician: '',
    completedAt: '',
    nextMaintenanceDate: '',
    status: 'open' as string,
    notes: '',
  })

  const { data, mutate } = useSWR('/api/admin/haccp/maintenance', swrFetcher)
  const items = (data?.items ?? []).filter((r: Record<string, string>) =>
    !search || r.equipment_name?.toLowerCase().includes(search.toLowerCase()) || r.issue?.toLowerCase().includes(search.toLowerCase())
  )

  const reset = () => {
    setForm({ reportedAt: new Date().toISOString().slice(0, 10), equipmentName: '', maintenanceType: 'Opravná', issue: '', actionTaken: '', technician: '', completedAt: '', nextMaintenanceDate: '', status: 'open', notes: '' })
    setError('')
  }

  const handleSubmit = async () => {
    if (!form.equipmentName.trim()) { setError('Zadajte zariadenie.'); return }
    if (!form.issue.trim()) { setError('Zadajte popis problému.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/haccp/maintenance', {
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
          <h1 className="font-heading text-2xl text-[#F5E3C2]">Údržba zariadení</h1>
          <p className="text-sm text-[#8C6F4E] mt-0.5">Záznamy o opravách, kalibrácii a preventívnej údržbe</p>
        </div>
        {canWrite && (
          <Button onClick={() => { reset(); setOpen(true) }} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Nový záznam
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C6F4E]" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať zariadenie / problém..." className="pl-9 bg-[#3a251a] border-[#8C6F4E]/30 text-[#F5E3C2] placeholder:text-[#8C6F4E]" />
      </div>

      {items.length === 0 ? (
        <HaccpEmptyState icon={<Wrench className="h-10 w-10 text-[#8C6F4E]" />} title="Žiadne záznamy" description={search ? 'Skúste iný výraz.' : 'Zatiaľ nebol zaznamenaný žiadny servisný zásah.'} />
      ) : (
        <div className="space-y-3">
          {items.map((r: Record<string, string>) => {
            const s = STATUS_LABELS[r.status] ?? { label: r.status, cls: 'bg-[#8C6F4E]/20 text-[#8C6F4E]' }
            return (
              <HaccpCard key={r.id}>
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-[#8C6F4E]">{r.reported_at ? new Date(r.reported_at).toLocaleDateString('sk-SK') : '—'}</span>
                      <Badge className="bg-[#E09E14]/10 text-[#E09E14] border-0 text-xs">{r.maintenance_type}</Badge>
                      <Badge className={`border-0 text-xs ${s.cls}`}>{s.label}</Badge>
                    </div>
                    <p className="text-sm text-[#F5E3C2] font-medium">{r.equipment_name}</p>
                    <p className="text-xs text-[#8C6F4E]">{r.issue}</p>
                    {r.technician && <p className="text-xs text-[#8C6F4E]">Technik: {r.technician}</p>}
                    {r.next_maintenance_date && <p className="text-xs text-[#8C6F4E]">Ďalší servis: {new Date(r.next_maintenance_date).toLocaleDateString('sk-SK')}</p>}
                  </div>
                  <span className="text-xs text-[#8C6F4E] shrink-0">{r.reported_by_name ?? '—'}</span>
                </div>
              </HaccpCard>
            )
          })}
        </div>
      )}

      <HaccpModal open={open} onOpenChange={setOpen} title="Servisný záznam" error={error} onSubmit={handleSubmit} saving={saving}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Dátum nahlásenia</label>
            <Input type="date" value={form.reportedAt} onChange={e => setForm(f => ({ ...f, reportedAt: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Typ údržby</label>
            <Select value={form.maintenanceType} onValueChange={v => setForm(f => ({ ...f, maintenanceType: v }))}>
              <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
              <SelectContent>{MAINTENANCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Zariadenie *</label>
          <Input value={form.equipmentName} onChange={e => setForm(f => ({ ...f, equipmentName: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" placeholder="napr. Chladnička č.1, Kávovar..." />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Popis problému / úlohy *</label>
          <Textarea value={form.issue} onChange={e => setForm(f => ({ ...f, issue: e.target.value }))} rows={2} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Vykonané opatrenie</label>
          <Textarea value={form.actionTaken} onChange={e => setForm(f => ({ ...f, actionTaken: e.target.value }))} rows={2} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Technik / firma</label>
            <Input value={form.technician} onChange={e => setForm(f => ({ ...f, technician: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Dátum dokončenia</label>
            <Input type="date" value={form.completedAt} onChange={e => setForm(f => ({ ...f, completedAt: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Ďalší plánovaný servis</label>
            <Input type="date" value={form.nextMaintenanceDate} onChange={e => setForm(f => ({ ...f, nextMaintenanceDate: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Stav</label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Otvorená</SelectItem>
                <SelectItem value="in_progress">V riešení</SelectItem>
                <SelectItem value="completed">Dokončená</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Poznámky</label>
          <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
      </HaccpModal>
    </div>
  )
}
