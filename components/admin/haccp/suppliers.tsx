'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HaccpCard, HaccpEmptyState, HaccpModal, swrFetcher } from './haccp-utils'
import { Truck, Plus, Search } from 'lucide-react'

export function SuppliersPage({ canWrite }: { canWrite: boolean }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', contactPerson: '', phone: '', email: '', address: '',
    categories: '', certifications: '', approvalStatus: 'approved' as string, notes: '',
  })

  const { data, mutate } = useSWR('/api/admin/haccp/suppliers', swrFetcher)
  const items = (data?.items ?? []).filter((r: Record<string, string>) =>
    !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.categories?.toLowerCase().includes(search.toLowerCase())
  )

  const reset = () => { setForm({ name: '', contactPerson: '', phone: '', email: '', address: '', categories: '', certifications: '', approvalStatus: 'approved', notes: '' }); setError('') }

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Zadajte názov dodávateľa.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/haccp/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Chyba') }
      await mutate(); setOpen(false); reset()
    } catch (e) { setError(e instanceof Error ? e.message : 'Chyba') } finally { setSaving(false) }
  }

  const STATUS_COLORS: Record<string, string> = { approved: 'bg-emerald-500/20 text-emerald-400', pending: 'bg-amber-500/20 text-amber-400', rejected: 'bg-red-500/20 text-red-400' }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-[#F5E3C2]">Dodávatelia</h1>
          <p className="text-sm text-[#8C6F4E] mt-0.5">Register schválených a posudzovaných dodávateľov</p>
        </div>
        {canWrite && (
          <Button onClick={() => { reset(); setOpen(true) }} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Nový dodávateľ
          </Button>
        )}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C6F4E]" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať dodávateľa..." className="pl-9 bg-[#3a251a] border-[#8C6F4E]/30 text-[#F5E3C2] placeholder:text-[#8C6F4E]" />
      </div>
      {items.length === 0 ? (
        <HaccpEmptyState icon={<Truck className="h-10 w-10 text-[#8C6F4E]" />} title="Žiadni dodávatelia" description={search ? 'Skúste iný výraz.' : 'Register dodávateľov je prázdny.'} />
      ) : (
        <div className="space-y-3">
          {items.map((r: Record<string, string>) => (
            <HaccpCard key={r.id}>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-[#F5E3C2] font-medium">{r.name}</p>
                    <Badge className={`border-0 text-xs ${STATUS_COLORS[r.approval_status] ?? 'bg-[#8C6F4E]/20 text-[#8C6F4E]'}`}>{r.approval_status}</Badge>
                  </div>
                  {r.categories && <p className="text-xs text-[#8C6F4E]">Kategórie: {r.categories}</p>}
                  {r.contact_person && <p className="text-xs text-[#8C6F4E]">{r.contact_person}{r.phone ? ` · ${r.phone}` : ''}{r.email ? ` · ${r.email}` : ''}</p>}
                  {r.certifications && <p className="text-xs text-[#8C6F4E]">Certifikáty: {r.certifications}</p>}
                </div>
              </div>
            </HaccpCard>
          ))}
        </div>
      )}
      <HaccpModal open={open} onOpenChange={setOpen} title="Nový dodávateľ" error={error} onSubmit={handleSubmit} saving={saving}>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Názov *</label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Kontaktná osoba</label>
            <Input value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Telefón</label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">E-mail</label>
          <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Adresa</label>
          <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Kategórie tovaru</label>
          <Input value={form.categories} onChange={e => setForm(f => ({ ...f, categories: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" placeholder="napr. Káva, Mlieko, Sirupy" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Certifikáty / schválenia</label>
          <Input value={form.certifications} onChange={e => setForm(f => ({ ...f, certifications: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" placeholder="napr. ISO 22000, BIO" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Stav schválenia</label>
          <Select value={form.approvalStatus} onValueChange={v => setForm(f => ({ ...f, approvalStatus: v }))}>
            <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="approved">Schválený</SelectItem>
              <SelectItem value="pending">Posudzovaný</SelectItem>
              <SelectItem value="rejected">Zamietnutý</SelectItem>
            </SelectContent>
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
