"use client"

import { useState, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

// ─── SWR fetcher ─────────────────────────────────────────────────────────────

export const swrFetcher = (url: string) => fetch(url).then(r => r.json())

// ─── Card wrapper ─────────────────────────────────────────────────────────────

export function HaccpCard({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      className={`rounded-xl border border-[#8C6F4E]/20 bg-[#3a251a] px-5 py-4 ${onClick ? 'cursor-pointer hover:border-[#E09E14]/40 transition-colors' : ''} ${className ?? ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// ─── Empty state (component-style, with icon as ReactNode) ────────────────────

export function HaccpEmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-[#8C6F4E]">
      <div className="mb-3 opacity-40">{icon}</div>
      <p className="text-sm font-medium text-[#F5E3C2]/60">{title}</p>
      {description && <p className="text-xs mt-1 text-[#8C6F4E]">{description}</p>}
    </div>
  )
}

// ─── Status badge for ok / deviation / critical ───────────────────────────────

export function HaccpStatusBadge({ result }: { result: 'ok' | 'deviation' | 'critical' }) {
  const map = {
    ok:        { label: 'OK',         cls: 'bg-green-900/40 text-green-300' },
    deviation: { label: 'Odchýlka',   cls: 'bg-amber-900/40 text-amber-300' },
    critical:  { label: 'Kritická',   cls: 'bg-red-900/40 text-red-300' },
  } as const
  const { label, cls } = map[result] ?? map.ok
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

// ─── Date range picker ────────────────────────────────────────────────────────

export function getMonthRange(offset = 0) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + offset
  const first = new Date(y, m, 1)
  const last = new Date(y, m + 1, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    from: `${first.getFullYear()}-${pad(first.getMonth() + 1)}-01`,
    to: `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`,
    label: first.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' }),
  }
}

export function DateRangeNav({
  offset,
  onOffset,
}: {
  offset: number
  onOffset: (n: number) => void
}) {
  const { label } = getMonthRange(offset)
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onOffset(offset - 1)}
        className="p-1.5 rounded-lg text-[#8C6F4E] hover:bg-[#8C6F4E]/20 transition-colors"
        aria-label="Predchádzajúci mesiac"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[120px] text-center text-sm text-[#F5E3C2] capitalize">{label}</span>
      <button
        onClick={() => onOffset(offset + 1)}
        disabled={offset >= 0}
        className="p-1.5 rounded-lg text-[#8C6F4E] hover:bg-[#8C6F4E]/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Nasledujúci mesiac"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
// Accepts both usage patterns:
//   • Simple:  open/onOpenChange/onSubmit/saving/error (most components)
//   • Minimal: title/onClose/children (direct children rendering)

type HaccpModalProps = {
  title: string
  children: React.ReactNode
  // pattern A – controlled with submit handler
  open?: boolean
  onOpenChange?: (v: boolean) => void
  onSubmit?: () => void | Promise<void>
  saving?: boolean
  error?: string
  // pattern B – simple close callback
  onClose?: () => void
}

export function HaccpModal({
  title,
  children,
  open,
  onOpenChange,
  onSubmit,
  saving,
  error,
  onClose,
}: HaccpModalProps) {
  // If using controlled open prop and it's false, render nothing
  if (open === false) return null

  const handleClose = () => {
    onOpenChange?.(false)
    onClose?.()
  }

  const overlayRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4"
      onClick={e => { if (e.target === overlayRef.current) handleClose() }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-[#8C6F4E]/30 bg-[#28170F] shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-[#8C6F4E]/20 px-5 py-4">
          <h2 className="font-heading text-lg text-[#F5E3C2]">{title}</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-[#8C6F4E] hover:bg-[#8C6F4E]/20 transition-colors"
            aria-label="Zavrieť"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {error && (
            <p className="rounded-lg bg-red-900/30 border border-red-700/40 px-3 py-2 text-xs text-red-300">{error}</p>
          )}
          {children}
          {onSubmit && (
            <div className="flex justify-end gap-3 pt-1 border-t border-[#8C6F4E]/20">
              <button type="button" onClick={handleClose} className="px-4 py-2 text-sm text-[#8C6F4E] hover:text-[#F5E3C2] transition-colors">
                Zrušiť
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-[#E09E14] px-5 py-2.5 text-sm font-semibold text-[#28170F] hover:bg-[#E09E14]/90 disabled:opacity-60 transition-colors"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Uložiť
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Form field ───────────────────────────────────────────────────────────────

export function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[#8C6F4E]">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export const inputCls = "w-full rounded-lg border border-[#8C6F4E]/40 bg-[#3a251a] px-3 py-2 text-sm text-[#F5E3C2] placeholder:text-[#8C6F4E]/60 focus:border-[#E09E14]/60 focus:outline-none focus:ring-1 focus:ring-[#E09E14]/30"
export const selectCls = inputCls + " cursor-pointer"
export const textareaCls = inputCls + " resize-none"

// ─── Submit button ────────────────────────────────────────────────────────────

export function SubmitBtn({ loading, label, wide }: { loading: boolean; label: string; wide?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`flex items-center justify-center gap-2 rounded-lg bg-[#E09E14] px-5 py-2.5 text-sm font-semibold text-[#28170F] hover:bg-[#E09E14]/90 disabled:opacity-60 transition-colors ${wide ? 'w-full' : ''}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-[#8C6F4E]">
      <Icon className="h-12 w-12 mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ─── Error / success toast ────────────────────────────────────────────────────

export function useToast() {
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const show = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }
  return { toast, ok: (m: string) => show('ok', m), err: (m: string) => show('err', m) }
}

export function Toast({ toast }: { toast: { type: 'ok' | 'err'; msg: string } | null }) {
  if (!toast) return null
  return (
    <div className={`fixed bottom-5 right-5 z-50 rounded-xl border px-4 py-3 text-sm shadow-lg ${
      toast.type === 'ok'
        ? 'border-green-700/50 bg-green-900/80 text-green-200'
        : 'border-red-700/50 bg-red-900/80 text-red-200'
    }`}>
      {toast.msg}
    </div>
  )
}

// ─── Pagination / table helpers ───────────────────────────────────────────────

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('sk-SK')
}

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? String(iso) : d.toLocaleString('sk-SK')
}

export function StatusPill({ ok, labels }: { ok: boolean; labels: [string, string] }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
      ok ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'
    }`}>
      {ok ? labels[0] : labels[1]}
    </span>
  )
}
