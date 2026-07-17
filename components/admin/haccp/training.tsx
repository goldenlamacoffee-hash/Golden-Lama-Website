'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HaccpCard, HaccpEmptyState, HaccpModal, swrFetcher } from './haccp-utils'
import { GraduationCap, Plus, Search } from 'lucide-react'

const TRAINING_TYPES = ['Vstupné školenie', 'Ročné HACCP', 'Hygiena a sanitácia', 'Alerény', 'Požiarna ochrana', 'Prvá pomoc', 'Iné']

export function TrainingPage({ canWrite }: { canWrite: boolean }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    trainingDate: new Date().toISOString().slice(0, 10),
    trainingType: 'Ročné HACCP',
    trainer: '',
    attendees: '',
    topics: '',
    duration: '',
    result: 'passed' as string,
    nextTrainingDate: '',
    notes: '',
  })

  const { data, mutate } = useSWR('/api/admin/haccp/training', swrFetcher)
  const items = (data?.items ?? []).filter((r: Record<string, string>) =>
    !search || r.training_type?.toLowerCase().includes(search.toLowerCase()) || r.trainer?.toLowerCase().includes(search.toLowerCase())
  )

  const reset = () => {
    setForm({ trainingDate: new Date().toISOString().slice(0, 10), trainingType: 'Ročné HACCP', trainer: '', attendees: '', topics: '', duration: '', result: 'passed', nextTrainingDate: '', notes: '' })
    setError('')
  }

  const handleSubmit = async () => {
    if (!form.trainingType.trim()) { setError('Zadajte typ školenia.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/haccp/training', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Chyba') }
      await mutate(); setOpen(false); reset()
    } catch (e) { setError(e instanceof Error ? e.message : 'Chyba') } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-[#F5E3C2]">Školenia</h1>
          <p className="text-sm text-[#8C6F4E] mt-0.5">Záznamy o školeniach zamestnancov v oblasti HACCP a hygieny</p>
        </div>
        {canWrite && (
          <Button onClick={() => { reset(); setOpen(true) }} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Nové školenie
          </Button>
        )}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C6F4E]" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať..." className="pl-9 bg-[#3a251a] border-[#8C6F4E]/30 text-[#F5E3C2] placeholder:text-[#8C6F4E]" />
      </div>
      {items.length === 0 ? (
        <HaccpEmptyState icon={<GraduationCap className="h-10 w-10 text-[#8C6F4E]" />} title="Žiadne školenia" description={search ? 'Skúste iný výraz.' : 'Zatiaľ nebolo pridané žiadne školenie.'} />
      ) : (
        <div className="space-y-3">
          {items.map((r: Record<string, string>) => (
            <HaccpCard key={r.id}>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[#8C6F4E]">{r.training_date ? new Date(r.training_date).toLocaleDateString('sk-SK') : '—'}</span>
                    <Badge className="bg-[#E09E14]/10 text-[#E09E14] border-0 text-xs">{r.training_type}</Badge>
                    {r.result === 'passed' && <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">Úspešné</Badge>}
                    {r.result === 'failed' && <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">Neúspešné</Badge>}
                  </div>
                  <p className="text-sm text-[#F5E3C2]">{r.topics ?? r.training_type}</p>
                  <p className="text-xs text-[#8C6F4E]">{r.trainer ? `Lektor: ${r.trainer}` : ''}{r.duration ? ` · ${r.duration} hod` : ''}</p>
                  {r.attendees && <p className="text-xs text-[#8C6F4E]">Účastníci: {r.attendees}</p>}
                  {r.next_training_date && <p className="text-xs text-[#8C6F4E]">Ďalšie: {new Date(r.next_training_date).toLocaleDateString('sk-SK')}</p>}
                </div>
              </div>
            </HaccpCard>
          ))}
        </div>
      )}
      <HaccpModal open={open} onOpenChange={setOpen} title="Nové školenie" error={error} onSubmit={handleSubmit} saving={saving}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Dátum</label>
            <Input type="date" value={form.trainingDate} onChange={e => setForm(f => ({ ...f, trainingDate: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Trvanie (hod)</label>
            <Input type="number" step="0.5" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Typ školenia</label>
          <Select value={form.trainingType} onValueChange={v => setForm(f => ({ ...f, trainingType: v }))}>
            <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
            <SelectContent>{TRAINING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Lektor / organizácia</label>
          <Input value={form.trainer} onChange={e => setForm(f => ({ ...f, trainer: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Účastníci</label>
          <Textarea value={form.attendees} onChange={e => setForm(f => ({ ...f, attendees: e.target.value }))} rows={2} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" placeholder="Mená zamestnancov..." />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Témy / osnova</label>
          <Textarea value={form.topics} onChange={e => setForm(f => ({ ...f, topics: e.target.value }))} rows={3} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Výsledok</label>
            <Select value={form.result} onValueChange={v => setForm(f => ({ ...f, result: v }))}>
              <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="passed">Úspešné</SelectItem>
                <SelectItem value="failed">Neúspešné</SelectItem>
                <SelectItem value="pending">Čaká sa na výsledok</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Dátum opakovacieho školenia</label>
            <Input type="date" value={form.nextTrainingDate} onChange={e => setForm(f => ({ ...f, nextTrainingDate: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
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
