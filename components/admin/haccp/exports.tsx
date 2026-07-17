'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, FileText, Loader2 } from 'lucide-react'

const EXPORT_SECTIONS = [
  { value: 'daily-checks', label: 'Denné kontroly' },
  { value: 'temperatures', label: 'Teplotné záznamy' },
  { value: 'sanitation', label: 'Sanitácia' },
  { value: 'water', label: 'Kontrola vody' },
  { value: 'receiving', label: 'Príjem surovín' },
  { value: 'discards', label: 'Výmety' },
  { value: 'non-conformities', label: 'Nezhody' },
  { value: 'pest-control', label: 'DDD záznamy' },
  { value: 'maintenance', label: 'Údržba' },
  { value: 'suppliers', label: 'Dodávatelia' },
  { value: 'training', label: 'Školenia' },
  { value: 'allergens', label: 'Alergény' },
]

export function ExportsPage() {
  const [section, setSection] = useState('daily-checks')
  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleExport = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ section, format, dateFrom, dateTo })
      const res = await fetch(`/api/admin/haccp/exports?${params}`)
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Export zlyhal') }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `haccp-${section}-${dateFrom}-${dateTo}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export zlyhal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-[#F5E3C2]">Export záznamov</h1>
        <p className="text-sm text-[#8C6F4E] mt-0.5">Stiahnite HACCP záznamy pre audit alebo archiváciu</p>
      </div>

      <div className="rounded-xl border border-[#8C6F4E]/20 bg-[#3a251a]/60 p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Sekcia / modul</label>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
              <SelectContent>{EXPORT_SECTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Formát</label>
            <Select value={format} onValueChange={v => setFormat(v as 'csv' | 'json')}>
              <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Excel)</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Dátum od</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-[#8C6F4E]">Dátum do</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-[#28170F] border-[#8C6F4E]/30 text-[#F5E3C2]" />
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button onClick={handleExport} disabled={loading} className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 w-full sm:w-auto">
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Exportujem...</>
          ) : (
            <><Download className="h-4 w-4 mr-2" /> Stiahnuť {EXPORT_SECTIONS.find(s => s.value === section)?.label}</>
          )}
        </Button>
      </div>

      <div className="rounded-xl border border-[#8C6F4E]/20 bg-[#3a251a]/40 p-5">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-[#E09E14] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm text-[#F5E3C2] font-medium">Informácie o exporte</p>
            <ul className="text-xs text-[#8C6F4E] space-y-1 list-disc list-inside">
              <li>CSV súbory sú kódované v UTF-8 a otvárajú sa v Exceli</li>
              <li>Export zahŕňa všetky záznamy v zvolenom dátumovom rozsahu</li>
              <li>Záznamy obsahujú meno zamestnanca, dátum a všetky relevantné polia</li>
              <li>Exporty sú vhodné pre audity veterinárnej správy a RÚVZ</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
