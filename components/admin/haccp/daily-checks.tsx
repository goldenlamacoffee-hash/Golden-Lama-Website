'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HaccpCard, HaccpEmptyState, HaccpModal, HaccpStatusBadge, swrFetcher } from './haccp-utils'
import { ClipboardCheck, Plus, Search, AlertTriangle } from 'lucide-react'

const CHECK_CATEGORIES = ['Otváranie', 'Uzatváranie', 'Zásobovanie', 'Iné']

export function DailyChecksPage({ canWrite }: { canWrite: boolean }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    checkDate: new Date().toISOString().slice(0, 10),
    category: 'Otváranie',
    checklist: '',
    result: 'ok' as 'ok' | 'deviation' | 'critical',
    deviation: '',
    correctiveAction: '',
    notes: '',
  })

  const { data, mutate } = useSWR('/api/admin/haccp/daily-checks', swrFetcher)
  const items = (data?.items ?? []).filter((r: Record<string, string>) =>
    !search || r.category?.toLowerCase().includes(search.toLowerCase()) || r.checklist?.toLowerCase().includes(search.toLowerCase())
  )

  const reset = () => {
    setForm({ checkDate: new Date().toISOString().slice(0, 10), category: 'Otváranie', checklist: '', result: 'ok', deviation: '', correctiveAction: '', notes: '' })
    setError('')
  }

  const handleSubmit = async () => {
    if (!form.checklist.trim()) { setError('Zadajte kontrolný zoznam.'); return }
    if (form.result !== 'ok' && !form.deviation.trim()) { setError('Zadajte popis odchýlky.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/haccp/daily-checks', {
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
          <h1 className="font-heading text-2xl text-[#F5E3C2]">Denné kontroly</h1>
          <p className="text-sm text-[#8C6F4E] mt-0.5">Otváracie / zatvárovacie kontrolné záznamy</p>
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
        <HaccpEmptyState icon={<ClipboardCheck className="h-10 w-10 text-[#8C6F4E]" />} title="Žiadne záznamy" description={search ? 'Skúste iný výraz.' : 'Zatiaľ nebola pridaná žiadna kontrola.'} />
      ) : (
        <div className="space-y-3">
          {items.map((r: Record<string, string>) => (
            <HaccpCard key={r.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[#8C6F4E]">{r.check_date ? new Date(r.check_date).toLocaleDateString('sk-SK') : '—'}</span>
                    <Badge className="bg-[#E09E14]/20 text-[#E09E14] border-0 text-xs">{r.category}</Badge>
                    <HaccpStatusBadge result={r.result as 'ok' | 'deviation' | 'critical'} />
                  </div>
                  <p className="text-sm text-[#F5E3C2] font-medium">{r.checklist}</p>
                  {r.deviation && (
                    <div className="flex items-start gap-1.5 mt-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-400">{r.deviation}</p>
                    </div>
                  )}
                  {r.corrective_action && <p className="text-xs text-[#8C6F4E]">Náprava: {r.corrective_action}</p>}
                </div>
                <span className="text-xs text-[#8C6F4E] shrink-0">{r.performed_by_name ?? '—'}</span>
              </div>
            </HaccpCard>
          ))}
        </div>
      )}

      <HaccpModal open={open} onOpenChange={setOpen} title="Nová denná kontrola" error={error} onSubmit={handleSubmit} saving={saving}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Dátum</label>
            <Input type="date" value={form.checkDate} onChange={e => setForm(f => ({ ...f, checkDate: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Kategória</label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
              <SelectContent>{CHECK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Kontrolný zoznam / popis *</label>
          <Textarea value={form.checklist} onChange={e => setForm(f => ({ ...f, checklist: e.target.value }))} rows={3} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" placeholder="Popíšte, čo bolo kontrolované..." />
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
              <label className="text-xs text-[#8C6F4E]">Popis odchýlky *</label>
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
