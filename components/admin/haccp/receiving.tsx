'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HaccpCard, HaccpEmptyState, HaccpModal, HaccpStatusBadge, swrFetcher } from './haccp-utils'
import { PackageCheck, Plus, Search } from 'lucide-react'

export function ReceivingPage({ canWrite }: { canWrite: boolean }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    receivedAt: new Date().toISOString().slice(0, 10),
    supplierId: '',
    supplierName: '',
    productName: '',
    batchNumber: '',
    quantityReceived: '',
    unit: 'kg',
    deliveryTemperature: '',
    packagingOk: true,
    labellingOk: true,
    result: 'ok' as 'ok' | 'deviation' | 'critical',
    rejectionReason: '',
    correctiveAction: '',
    notes: '',
  })

  const { data: settingsData } = useSWR('/api/admin/haccp/settings', swrFetcher)
  const suppliers = settingsData?.settings?.suppliers ?? []
  const { data, mutate } = useSWR('/api/admin/haccp/receiving', swrFetcher)
  const items = (data?.items ?? []).filter((r: Record<string, string>) =>
    !search || r.product_name?.toLowerCase().includes(search.toLowerCase()) || r.supplier_name?.toLowerCase().includes(search.toLowerCase())
  )

  const reset = () => {
    setForm({ receivedAt: new Date().toISOString().slice(0, 10), supplierId: '', supplierName: '', productName: '', batchNumber: '', quantityReceived: '', unit: 'kg', deliveryTemperature: '', packagingOk: true, labellingOk: true, result: 'ok', rejectionReason: '', correctiveAction: '', notes: '' })
    setError('')
  }

  const handleSubmit = async () => {
    if (!form.productName.trim()) { setError('Zadajte názov produktu.'); return }
    if (!form.supplierName.trim()) { setError('Zadajte dodávateľa.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/haccp/receiving', {
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
          <h1 className="font-heading text-2xl text-[#F5E3C2]">Príjem surovín</h1>
          <p className="text-sm text-[#8C6F4E] mt-0.5">Záznamy o príjme a kontrole dodaného tovaru</p>
        </div>
        {canWrite && (
          <Button onClick={() => { reset(); setOpen(true) }} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Nový príjem
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C6F4E]" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hľadať produkt / dodávateľa..." className="pl-9 bg-[#3a251a] border-[#8C6F4E]/30 text-[#F5E3C2] placeholder:text-[#8C6F4E]" />
      </div>

      {items.length === 0 ? (
        <HaccpEmptyState icon={<PackageCheck className="h-10 w-10 text-[#8C6F4E]" />} title="Žiadne záznamy" description={search ? 'Skúste iný výraz.' : 'Zatiaľ nebol zaznamenaný žiadny príjem.'} />
      ) : (
        <div className="space-y-3">
          {items.map((r: Record<string, string>) => (
            <HaccpCard key={r.id}>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[#8C6F4E]">{r.received_at ? new Date(r.received_at).toLocaleDateString('sk-SK') : '—'}</span>
                    <HaccpStatusBadge result={r.result as 'ok' | 'deviation' | 'critical'} />
                  </div>
                  <p className="text-sm text-[#F5E3C2] font-medium">{r.product_name}</p>
                  <p className="text-xs text-[#8C6F4E]">{r.supplier_name} {r.batch_number ? `· Šarža: ${r.batch_number}` : ''} {r.quantity_received ? `· ${r.quantity_received} ${r.unit}` : ''}</p>
                  {r.delivery_temperature != null && <p className="text-xs text-[#8C6F4E]">Teplota pri dodávke: {r.delivery_temperature} °C</p>}
                  {r.rejection_reason && <p className="text-xs text-red-400">Odmietnuté: {r.rejection_reason}</p>}
                </div>
                <span className="text-xs text-[#8C6F4E] shrink-0">{r.received_by_name ?? '—'}</span>
              </div>
            </HaccpCard>
          ))}
        </div>
      )}

      <HaccpModal open={open} onOpenChange={setOpen} title="Príjem surovín / tovaru" error={error} onSubmit={handleSubmit} saving={saving}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Dátum príjmu</label>
            <Input type="date" value={form.receivedAt} onChange={e => setForm(f => ({ ...f, receivedAt: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Teplota pri dodávke (°C)</label>
            <Input type="number" step="0.1" value={form.deliveryTemperature} onChange={e => setForm(f => ({ ...f, deliveryTemperature: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
        </div>
        {suppliers.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Dodávateľ (z registra)</label>
            <Select onValueChange={id => { const s = suppliers.find((x: Record<string, string>) => x.id === id); if (s) setForm(f => ({ ...f, supplierId: id, supplierName: s.name })) }}>
              <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue placeholder="Vybrať..." /></SelectTrigger>
              <SelectContent>{suppliers.map((s: Record<string, string>) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Dodávateľ *</label>
          <Input value={form.supplierName} onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Názov produktu *</label>
          <Input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Šarža / LOT</label>
            <Input value={form.batchNumber} onChange={e => setForm(f => ({ ...f, batchNumber: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Množstvo</label>
            <Input type="number" step="0.01" value={form.quantityReceived} onChange={e => setForm(f => ({ ...f, quantityReceived: e.target.value }))} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Jednotka</label>
            <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
              <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
              <SelectContent>{['kg', 'g', 'l', 'ml', 'ks', 'bal'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-6">
          {[['packagingOk', 'Obal v poriadku'], ['labellingOk', 'Etiketa v poriadku']].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-[#F5E3C2] cursor-pointer">
              <input type="checkbox" checked={form[key as keyof typeof form] as boolean} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} className="rounded border-[#8C6F4E]/30" />
              {label}
            </label>
          ))}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-[#8C6F4E]">Výsledok</label>
          <Select value={form.result} onValueChange={v => setForm(f => ({ ...f, result: v as typeof form.result }))}>
            <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ok">Prijatý</SelectItem>
              <SelectItem value="deviation">Podmienečne prijatý</SelectItem>
              <SelectItem value="critical">Odmietnutý</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.result !== 'ok' && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs text-[#8C6F4E]">Dôvod odmietnutia / odchýlky</label>
              <Textarea value={form.rejectionReason} onChange={e => setForm(f => ({ ...f, rejectionReason: e.target.value }))} rows={2} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
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
