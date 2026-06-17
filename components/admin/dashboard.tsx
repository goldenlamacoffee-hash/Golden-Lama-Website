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
import { LogOut, Coffee, MapPin, Image as ImageIcon, FileText, Shield, ScrollText, Users, Lock, CalendarDays } from "lucide-react"

interface AdminDashboardProps {
  initialData: SiteData
  currentUser: { name: string; email: string; role: AdminRole }
  canEdit: boolean
  canManageUsers: boolean
  canViewCalendar: boolean
  canViewOwnShifts: boolean
}

export function AdminDashboard({
  initialData,
  currentUser,
  canEdit,
  canManageUsers,
  canViewCalendar,
  canViewOwnShifts,
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
              <a
                href="/admin/calendar"
                className="text-[#8C6F4E] hover:text-[#E09E14] text-sm flex items-center gap-1"
              >
                <CalendarDays className="h-4 w-4" />
                Kalendár
              </a>
            ) : canViewOwnShifts ? (
              <a
                href="/admin/my-shifts"
                className="text-[#8C6F4E] hover:text-[#E09E14] text-sm flex items-center gap-1"
              >
                <CalendarDays className="h-4 w-4" />
                Moje zmeny
              </a>
            ) : null}
            {canManageUsers && (
              <a
                href="/admin/users"
                className="text-[#8C6F4E] hover:text-[#E09E14] text-sm flex items-center gap-1"
              >
                <Users className="h-4 w-4" />
                Používatelia
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
