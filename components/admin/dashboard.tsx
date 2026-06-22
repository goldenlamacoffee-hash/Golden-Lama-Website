"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MenuEditor } from "./menu-editor"
import { ScheduleEditor } from "./schedule-editor"
import { GalleryEditor } from "./gallery-editor"
import { ContentEditor } from "./content-editor"
import { LegalEditor } from "./legal-editor"
import type { SiteData } from "@/lib/types"
import type { AdminRole } from "@/lib/permissions"
import { ROLE_LABELS } from "@/lib/permissions"
import { LogOut, Coffee, MapPin, Image as ImageIcon, FileText, Shield, ScrollText, Users, Lock, CalendarDays, CalendarClock, CalendarOff, ExternalLink, Smartphone, Package, Trophy, Sparkles, FileSpreadsheet } from "lucide-react"

interface AdminDashboardProps {
  initialData: SiteData
  currentUser: { name: string; email: string; role: AdminRole }
  canEdit: boolean
  canManageUsers: boolean
  canViewCalendar: boolean
  canViewOwnShifts: boolean
  canViewInventory: boolean
  canViewMotivation: boolean
  canViewOwnPoints: boolean
  canViewReports: boolean
  canViewAppAdmin: boolean
  appAdminUrl: string
}

export function AdminDashboard({
  initialData,
  currentUser,
  canEdit,
  canManageUsers,
  canViewCalendar,
  canViewOwnShifts,
  canViewInventory,
  canViewMotivation,
  canViewOwnPoints,
  canViewReports,
  canViewAppAdmin,
  appAdminUrl,
}: AdminDashboardProps) {
  const [data, setData] = useState(initialData)
  const router = useRouter()

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#28170F]">
      <header className="bg-[#3a251a] border-b border-[#8C6F4E]/30 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Golden Lama Coffee"
              width={40}
              height={40}
              className="rounded-full"
            />
            <div>
              <h1 className="font-heading text-xl text-[#F5E3C2] leading-tight">Admin Panel</h1>
              <p className="text-xs text-[#8C6F4E]">
                {currentUser.name} · {ROLE_LABELS[currentUser.role]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {canViewCalendar ? (
              <>
                <a
                  href="/admin/shifts"
                  className="text-[#8C6F4E] hover:text-[#E09E14] text-sm flex items-center gap-1"
                >
                  <CalendarClock className="h-4 w-4" />
                  Zmeny
                </a>
                <a
                  href="/admin/calendar"
                  className="text-[#8C6F4E] hover:text-[#E09E14] text-sm flex items-center gap-1"
                >
                  <CalendarOff className="h-4 w-4" />
                  Neprítomnosti
                </a>
              </>
            ) : canViewOwnShifts ? (
              <a
                href="/admin/my-shifts"
                className="text-[#8C6F4E] hover:text-[#E09E14] text-sm flex items-center gap-1"
              >
                <CalendarDays className="h-4 w-4" />
                Môj rozpis
              </a>
            ) : null}
            {canViewInventory && (
              <a
                href="/admin/inventory"
                className="text-[#8C6F4E] hover:text-[#E09E14] text-sm flex items-center gap-1"
              >
                <Package className="h-4 w-4" />
                Sklad
              </a>
            )}
            {canViewMotivation ? (
              <a
                href="/admin/motivation"
                className="text-[#8C6F4E] hover:text-[#E09E14] text-sm flex items-center gap-1"
              >
                <Trophy className="h-4 w-4" />
                Motivácia
              </a>
            ) : canViewOwnPoints ? (
              <a
                href="/admin/my-points"
                className="text-[#8C6F4E] hover:text-[#E09E14] text-sm flex items-center gap-1"
              >
                <Sparkles className="h-4 w-4" />
                Moje body
              </a>
            ) : null}
            {canEdit && (
              <a
                href="/admin/media"
                className="text-[#8C6F4E] hover:text-[#E09E14] text-sm flex items-center gap-1"
              >
                <ImageIcon className="h-4 w-4" />
                Médiá
              </a>
            )}
            {canManageUsers && (
              <a
                href="/admin/users"
                className="text-[#8C6F4E] hover:text-[#E09E14] text-sm flex items-center gap-1"
              >
                <Users className="h-4 w-4" />
                Používatelia
              </a>
            )}
            {canViewReports && (
              <a
                href="/admin/reports"
                className="text-[#8C6F4E] hover:text-[#E09E14] text-sm flex items-center gap-1"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Reporty
              </a>
            )}
            <a 
              href="/" 
              target="_blank" 
              className="text-[#8C6F4E] hover:text-[#E09E14] text-sm"
            >
              Zobraziť stránku
            </a>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Odhlásiť
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {canViewAppAdmin && (
          <div className="mb-6 flex flex-col gap-4 rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E09E14]/15">
                <Smartphone className="h-5 w-5 text-[#E09E14]" />
              </div>
              <div>
                <h2 className="font-heading text-lg text-[#F5E3C2] leading-tight">Správa aplikácie</h2>
                <p className="text-sm text-[#8C6F4E]">
                  Menu, kupóny, udalosti, lokality a nastavenia mobilnej aplikácie
                </p>
              </div>
            </div>
            <Button
              asChild
              className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 shrink-0"
            >
              <a href={appAdminUrl} target="_blank" rel="noopener noreferrer">
                Otvoriť App Admin
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        )}
        {canViewCalendar && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E09E14]/15">
                  <CalendarClock className="h-5 w-5 text-[#E09E14]" />
                </div>
                <div>
                  <h2 className="font-heading text-lg text-[#F5E3C2] leading-tight">Zmeny</h2>
                  <p className="text-sm text-[#8C6F4E]">Plánovanie pracovných zmien</p>
                </div>
              </div>
              <Button asChild className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 w-full">
                <a href="/admin/shifts">
                  Otvoriť zmeny
                  <CalendarClock className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
            <div className="flex flex-col gap-4 rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E09E14]/15">
                  <CalendarOff className="h-5 w-5 text-[#E09E14]" />
                </div>
                <div>
                  <h2 className="font-heading text-lg text-[#F5E3C2] leading-tight">Neprítomnosti</h2>
                  <p className="text-sm text-[#8C6F4E]">Dovolenky, PN a dostupnosť tímu</p>
                </div>
              </div>
              <Button asChild className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 w-full">
                <a href="/admin/calendar">
                  Otvoriť neprítomnosti
                  <CalendarOff className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
          </div>
        )}
        {canViewOwnShifts && !canViewCalendar && (
          <div className="mb-6 flex flex-col gap-4 rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E09E14]/15">
                <CalendarDays className="h-5 w-5 text-[#E09E14]" />
              </div>
              <div>
                <h2 className="font-heading text-lg text-[#F5E3C2] leading-tight">Môj rozpis</h2>
                <p className="text-sm text-[#8C6F4E]">Tvoje zmeny a neprítomnosti</p>
              </div>
            </div>
            <Button asChild className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 shrink-0">
              <a href="/admin/my-shifts">
                Zobraziť rozpis
                <CalendarDays className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        )}
        {canViewInventory && (
          <div className="mb-6 flex flex-col gap-4 rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E09E14]/15">
                <Package className="h-5 w-5 text-[#E09E14]" />
              </div>
              <div>
                <h2 className="font-heading text-lg text-[#F5E3C2] leading-tight">Sklad</h2>
                <p className="text-sm text-[#8C6F4E]">Zásoby, prevádzkové položky a majetok</p>
              </div>
            </div>
            <Button asChild className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 shrink-0">
              <a href="/admin/inventory">
                Otvoriť sklad
                <Package className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        )}
        {canViewMotivation && (
          <div className="mb-6 flex flex-col gap-4 rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E09E14]/15">
                <Trophy className="h-5 w-5 text-[#E09E14]" />
              </div>
              <div>
                <h2 className="font-heading text-lg text-[#F5E3C2] leading-tight">Motivácia tímu</h2>
                <p className="text-sm text-[#8C6F4E]">Golden Points, rebríček a odhady bonusov</p>
              </div>
            </div>
            <Button asChild className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 shrink-0">
              <a href="/admin/motivation">
                Otvoriť motiváciu
                <Trophy className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        )}
        {canViewOwnPoints && !canViewMotivation && (
          <div className="mb-6 flex flex-col gap-4 rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E09E14]/15">
                <Sparkles className="h-5 w-5 text-[#E09E14]" />
              </div>
              <div>
                <h2 className="font-heading text-lg text-[#F5E3C2] leading-tight">Moje body</h2>
                <p className="text-sm text-[#8C6F4E]">Tvoje Golden Points, progres a odhad bonusu</p>
              </div>
            </div>
            <Button asChild className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 shrink-0">
              <a href="/admin/my-points">
                Zobraziť moje body
                <Sparkles className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        )}
        {canViewReports && (
          <div className="mb-6 flex flex-col gap-4 rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E09E14]/15">
                <FileSpreadsheet className="h-5 w-5 text-[#E09E14]" />
              </div>
              <div>
                <h2 className="font-heading text-lg text-[#F5E3C2] leading-tight">Reporty a exporty</h2>
                <p className="text-sm text-[#8C6F4E]">Stiahnite si zmeny, neprítomnosti, sklad a body do Excelu</p>
              </div>
            </div>
            <Button asChild className="bg-[#E09E14] text-[#28170F] hover:bg-[#E09E14]/90 shrink-0">
              <a href="/admin/reports">
                Otvoriť reporty
                <FileSpreadsheet className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        )}
        {!canEdit && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] px-4 py-3 text-sm text-[#F5E3C2]">
            <Lock className="h-4 w-4 text-[#E09E14]" />
            Máte prístup iba na čítanie. Zmeny nebude možné uložiť.
          </div>
        )}
        <Tabs defaultValue="menu" className="space-y-6">
          <TabsList className="bg-[#3a251a] border border-[#8C6F4E]/30">
            <TabsTrigger 
              value="menu" 
              className="data-[state=active]:bg-[#E09E14] data-[state=active]:text-[#28170F] text-[#F5E3C2]"
            >
              <Coffee className="h-4 w-4 mr-2" />
              Menu
            </TabsTrigger>
            <TabsTrigger 
              value="schedule"
              className="data-[state=active]:bg-[#E09E14] data-[state=active]:text-[#28170F] text-[#F5E3C2]"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Rozvrh
            </TabsTrigger>
            <TabsTrigger 
              value="gallery"
              className="data-[state=active]:bg-[#E09E14] data-[state=active]:text-[#28170F] text-[#F5E3C2]"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Galéria
            </TabsTrigger>
            <TabsTrigger 
              value="content"
              className="data-[state=active]:bg-[#E09E14] data-[state=active]:text-[#28170F] text-[#F5E3C2]"
            >
              <FileText className="h-4 w-4 mr-2" />
              Obsah
            </TabsTrigger>
            <TabsTrigger 
              value="privacy"
              className="data-[state=active]:bg-[#E09E14] data-[state=active]:text-[#28170F] text-[#F5E3C2]"
            >
              <Shield className="h-4 w-4 mr-2" />
              Súkromie
            </TabsTrigger>
            <TabsTrigger 
              value="terms"
              className="data-[state=active]:bg-[#E09E14] data-[state=active]:text-[#28170F] text-[#F5E3C2]"
            >
              <ScrollText className="h-4 w-4 mr-2" />
              Podmienky
            </TabsTrigger>
          </TabsList>

          <TabsContent value="menu">
            <MenuEditor menu={data.menu} setMenu={(menu) => setData({ ...data, menu })} />
          </TabsContent>

          <TabsContent value="schedule">
            <ScheduleEditor schedule={data.schedule} setSchedule={(schedule) => setData({ ...data, schedule })} />
          </TabsContent>

          <TabsContent value="gallery">
            <GalleryEditor gallery={data.gallery} setGallery={(gallery) => setData({ ...data, gallery })} />
          </TabsContent>

          <TabsContent value="content">
            <ContentEditor content={data.content} setContent={(content) => setData({ ...data, content })} />
          </TabsContent>

          <TabsContent value="privacy">
            <LegalEditor type="privacy" initialData={data.privacy} />
          </TabsContent>

          <TabsContent value="terms">
            <LegalEditor type="terms" initialData={data.terms} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
