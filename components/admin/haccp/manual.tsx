'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HaccpCard, HaccpEmptyState, HaccpModal, swrFetcher } from './haccp-utils'
import { BookOpen, Plus, Search, ChevronDown, ChevronRight } from 'lucide-react'

const DOC_TYPES = ['Príručka HACCP', 'Pracovný postup', 'Formulár', 'Interná smernica', 'Legislatíva', 'Iné']

export function ManualPage({ canWrite }: { canWrite: boolean }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    documentType: 'Príručka HACCP',
    version: '1.0',
    effectiveDate: new Date().toISOString().slice(0, 10),
    content: '',
    status: 'active' as string,
    notes: '',
  })

  const { data, mutate } = useSWR('/api/admin/haccp/manual', swrFetcher)
  const items = (data?.items ?? []).filter((r: Record<string, string>) =>
    !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.document_type?.toLowerCase().includes(search.toLowerCase())
  )

  const reset = () => {
    setForm({ title: '', documentType: 'Príručka HACCP', version: '1.0', effectiveDate: new Date().toISOString().slice(0, 10), content: '', status: 'active', notes: '' })
    setError('')
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Zadajte názov dokumentu.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/haccp/manual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Chyba') }
      await mutate(); setOpen(false); reset()
    } catch (e) { setError(e instanceof Error ? e.message : 'Chyba') } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-[#F5E3C2]">Príručka HACCP</h1>
          <p className="text-sm text-[#8C6F4E] mt-0.5">Dokumentácia, pracovné postupy a interné smernice</p>
        </div>
        {canWrite && (
          <Button onClick={() => { reset(); setOpen(true) }} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Nový dokument
          </Button>
        )}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C6F4E]" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať dokument..." className="pl-9 bg-[#3a251a] border-[#8C6F4E]/30 text-[#F5E3C2] placeholder:text-[#8C6F4E]" />
      </div>
      {items.length === 0 ? (
        <HaccpEmptyState icon={<BookOpen className="h-10 w-10 text-[#8C6F4E]" />} title="Žiadne dokumenty" description={search ? 'Skúste iný výraz.' : 'Príručka HACCP je zatiaľ prázdna.'} />
      ) : (
        <div className="space-y-2">
          {items.map((r: Record<string, string>) => (
            <HaccpCard key={r.id} className="cursor-pointer" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-[#8C6F4E]">
                  {expanded === r.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-[#F5E3C2] font-medium">{r.title}</p>
                    <Badge className="bg-[#E09E14]/10 text-[#E09E14] border-0 text-xs">{r.document_type}</Badge>
                    <span className="text-xs text-[#8C6F4E]">v{r.version}</span>
                    {r.status === 'active' ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">Platný</Badge>
                    ) : (
                      <Badge className="bg-[#8C6F4E]/20 text-[#8C6F4E] border-0 text-xs">Archív</Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#8C6F4E] mt-0.5">Platnosť od: {r.effective_date ? new Date(r.effective_date).toLocaleDateString('sk-SK') : '—'}</p>
                  {expanded === r.id && r.content && (
                    <div className="mt-3 text-sm text-[#F5E3C2]/80 whitespace-pre-wrap border-t border-[#8C6F4E]/20 pt-3">
                      {r.content}
                    </div>
                  )}
                </div>
              </div>
            </HaccpCard>
          ))}
        </div>
      )}
      <HaccpModal open={open} onOpenChange={setOpen} title="Nový dokument" error={error} onSubmit={handleSubmit} saving={saving}>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Názov dokumentu *</label>
          <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Typ dokumentu</label>
            <Select value={form.documentType} onValueChange={v => setForm(f => ({ ...f, documentType: v }))}>
              <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
              <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Verzia</label>
            <Input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Platnosť od</label>
            <Input type="date" value={form.effectiveDate} onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Obsah dokumentu</label>
          <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={8} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2] font-mono text-xs" placeholder="Text dokumentu, postup, smernica..." />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Stav</label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Platný</SelectItem>
              <SelectItem value="archived">Archivovaný</SelectItem>
              <SelectItem value="draft">Návrh</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </HaccpModal>
    </div>
  )
}
