'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HaccpCard, HaccpEmptyState, HaccpModal, swrFetcher } from './haccp-utils'
import { Trash2, Plus, Search } from 'lucide-react'

const DISCARD_REASONS = ['Uplynutá exspirácia', 'Poškodený obal', 'Nevhodná teplota', 'Organoleptická chyba', 'Krížová kontaminácia', 'Iné']
const DISPOSAL_METHODS = ['Biologický odpad', 'Komunálny odpad', 'Špeciálna likvidácia', 'Iné']

export function DiscardsPage({ canWrite }: { canWrite: boolean }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    discardDate: new Date().toISOString().slice(0, 10),
    productName: '',
    batchNumber: '',
    quantity: '',
    unit: 'kg',
    discardReason: 'Uplynutá exspirácia',
    disposalMethod: 'Biologický odpad',
    notes: '',
  })

  const { data, mutate } = useSWR('/api/admin/haccp/discards', swrFetcher)
  const items = (data?.items ?? []).filter((r: Record<string, string>) =>
    !search || r.product_name?.toLowerCase().includes(search.toLowerCase())
  )

  const reset = () => {
    setForm({ discardDate: new Date().toISOString().slice(0, 10), productName: '', batchNumber: '', quantity: '', unit: 'kg', discardReason: 'Uplynutá exspirácia', disposalMethod: 'Biologický odpad', notes: '' })
    setError('')
  }

  const handleSubmit = async () => {
    if (!form.productName.trim()) { setError('Zadajte názov produktu.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/haccp/discards', {
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
          <h1 className="font-heading text-2xl text-[#F5E3C2]">Výmety / znehodnotenie</h1>
          <p className="text-sm text-[#8C6F4E] mt-0.5">Záznamy o likvidácii nepodarkov a nevyhovujúcich surovín</p>
        </div>
        {canWrite && (
          <Button onClick={() => { reset(); setOpen(true) }} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Nový výmet
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C6F4E]" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať produkt..." className="pl-9 bg-[#3a251a] border-[#8C6F4E]/30 text-[#F5E3C2] placeholder:text-[#8C6F4E]" />
      </div>

      {items.length === 0 ? (
        <HaccpEmptyState icon={<Trash2 className="h-10 w-10 text-[#8C6F4E]" />} title="Žiadne záznamy" description={search ? 'Skúste iný výraz.' : 'Zatiaľ nebol zaznamenaný žiadny výmet.'} />
      ) : (
        <div className="space-y-3">
          {items.map((r: Record<string, string>) => (
            <HaccpCard key={r.id}>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-[#8C6F4E]">{r.discard_date ? new Date(r.discard_date).toLocaleDateString('sk-SK') : '—'}</span>
                  <p className="text-sm text-[#F5E3C2] font-medium">{r.product_name}</p>
                  <p className="text-xs text-[#8C6F4E]">
                    {r.quantity ? `${r.quantity} ${r.unit} · ` : ''}{r.discard_reason}
                  </p>
                  <p className="text-xs text-[#8C6F4E]">Likvidácia: {r.disposal_method}</p>
                  {r.batch_number && <p className="text-xs text-[#8C6F4E]">Šarža: {r.batch_number}</p>}
                </div>
                <span className="text-xs text-[#8C6F4E] shrink-0">{r.discarded_by_name ?? '—'}</span>
              </div>
            </HaccpCard>
          ))}
        </div>
      )}

      <HaccpModal open={open} onOpenChange={setOpen} title="Výmet / znehodnotenie" error={error} onSubmit={handleSubmit} saving={saving}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Dátum</label>
            <Input type="date" value={form.discardDate} onChange={e => setForm(f => ({ ...f, discardDate: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Šarža / LOT</label>
            <Input value={form.batchNumber} onChange={e => setForm(f => ({ ...f, batchNumber: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Názov produktu *</label>
          <Input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Množstvo</label>
            <Input type="number" step="0.01" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Jednotka</label>
            <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
              <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
              <SelectContent>{['kg', 'g', 'l', 'ml', 'ks', 'bal'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Dôvod vyradenia</label>
          <Select value={form.discardReason} onValueChange={v => setForm(f => ({ ...f, discardReason: v }))}>
            <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
            <SelectContent>{DISCARD_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Spôsob likvidácie</label>
          <Select value={form.disposalMethod} onValueChange={v => setForm(f => ({ ...f, disposalMethod: v }))}>
            <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
            <SelectContent>{DISPOSAL_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Poznámky</label>
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
      </HaccpModal>
    </div>
  )
}
