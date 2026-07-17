"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { ROLE_LABELS, type AdminRole } from '@/lib/permissions'
import {
  LayoutDashboard, ClipboardCheck, Thermometer, Sparkles, Droplets,
  PackageCheck, Trash2, AlertTriangle, Bug, Wrench,
  Users, FlaskConical, BookOpen, GraduationCap,
  FileSpreadsheet, Settings, LogOut, Menu, X, ShieldCheck,
} from 'lucide-react'

interface HaccpShellProps {
  userName: string
  userRole: AdminRole
  canWrite: boolean
  canSettings: boolean
  canExports: boolean
  children: React.ReactNode
}

type NavItem = { href: string; label: string; icon: React.ReactNode; settingsOnly?: boolean; exportsOnly?: boolean }

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Prevádzka',
    items: [
      { href: '/admin/haccp', label: 'Prehľad', icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: '/admin/haccp/daily-checks', label: 'Denné kontroly', icon: <ClipboardCheck className="h-4 w-4" /> },
      { href: '/admin/haccp/temperatures', label: 'Teploty', icon: <Thermometer className="h-4 w-4" /> },
      { href: '/admin/haccp/sanitation', label: 'Sanitácia', icon: <Sparkles className="h-4 w-4" /> },
      { href: '/admin/haccp/water', label: 'Manipulácia s vodou', icon: <Droplets className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Suroviny a výroba',
    items: [
      { href: '/admin/haccp/receiving', label: 'Príjem surovín', icon: <PackageCheck className="h-4 w-4" /> },
      { href: '/admin/haccp/discards', label: 'Vyradenie', icon: <Trash2 className="h-4 w-4" /> },
      { href: '/admin/haccp/non-conformities', label: 'Nezhody', icon: <AlertTriangle className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Zariadenia a prostredie',
    items: [
      { href: '/admin/haccp/pest-control', label: 'Škodcovia', icon: <Bug className="h-4 w-4" /> },
      { href: '/admin/haccp/maintenance', label: 'Údržba', icon: <Wrench className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Dokumentácia',
    items: [
      { href: '/admin/haccp/suppliers', label: 'Dodávatelia', icon: <Users className="h-4 w-4" />, settingsOnly: true },
      { href: '/admin/haccp/ingredients', label: 'Suroviny', icon: <FlaskConical className="h-4 w-4" />, settingsOnly: true },
      { href: '/admin/haccp/allergens', label: 'Alergény', icon: <ShieldCheck className="h-4 w-4" /> },
      { href: '/admin/haccp/manual', label: 'HACCP manuál', icon: <BookOpen className="h-4 w-4" />, settingsOnly: true },
      { href: '/admin/haccp/training', label: 'Školenia', icon: <GraduationCap className="h-4 w-4" />, settingsOnly: true },
    ],
  },
  {
    label: 'Nástroje',
    items: [
      { href: '/admin/haccp/exports', label: 'Exporty', icon: <FileSpreadsheet className="h-4 w-4" />, exportsOnly: true },
      { href: '/admin/haccp/settings', label: 'Nastavenia', icon: <Settings className="h-4 w-4" />, settingsOnly: true },
    ],
  },
]

export function HaccpShell({ userName, userRole, canWrite, canSettings, canExports, children }: HaccpShellProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/admin/haccp' ? pathname === href : pathname.startsWith(href)

  const visibleGroups = NAV_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(i => {
      if (i.settingsOnly && !canSettings) return false
      if (i.exportsOnly && !canExports) return false
      return true
    }),
  })).filter(g => g.items.length > 0)

  const sidebarContent = (
    <nav className="flex flex-col gap-4">
      {visibleGroups.map(group => (
        <div key={group.label}>
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#8C6F4E]">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map(item => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive(item.href)
                      ? 'bg-[#E09E14] text-[#28170F] font-semibold'
                      : 'text-[#F5E3C2] hover:bg-[#8C6F4E]/20'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-[#28170F]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-[#3a251a] border-b border-[#8C6F4E]/30 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-1.5 text-[#F5E3C2] hover:bg-[#8C6F4E]/20 rounded-lg"
              onClick={() => setSidebarOpen(v => !v)}
              aria-label="Otvoriť menu"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link href="/admin/haccp" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Golden Lama" width={30} height={30} className="rounded-full" />
              <div className="hidden sm:block">
                <p className="font-heading text-sm text-[#F5E3C2] leading-tight">HACCP</p>
                <p className="text-[10px] text-[#8C6F4E] leading-tight">Golden Lama Coffee</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:block text-xs text-[#8C6F4E]">
              {userName} &middot; {ROLE_LABELS[userRole]}
            </span>
            <Link
              href="/admin"
              className="text-xs text-[#8C6F4E] hover:text-[#E09E14] transition-colors hidden sm:block"
            >
              Admin panel
            </Link>
            <form action="/api/admin/logout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[#F5E3C2] border border-[#8C6F4E]/40 hover:bg-[#8C6F4E]/20 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Odhlásiť</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto border-r border-[#8C6F4E]/20 pt-5 pb-8 px-3">
          {sidebarContent}
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-20 flex">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative z-30 w-64 bg-[#3a251a] border-r border-[#8C6F4E]/30 pt-5 pb-8 px-3 overflow-y-auto">
              {sidebarContent}
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 py-6 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  )
}
