import { redirect } from "next/navigation"
import { ensureOwnerBootstrap, getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { CalendarManager } from "@/components/admin/calendar-manager"

export default async function MyShiftsPage() {
  await ensureOwnerBootstrap()
  const user = await getCurrentUser()

  if (!user) {
    redirect("/admin/login")
  }
  if (!can(user.role, "calendar:read_own")) {
    redirect("/admin")
  }

  const canReadAll = can(user.role, "calendar:read_all")

  return (
    <CalendarManager
      currentUser={{ id: user.id, name: user.name, email: user.email }}
      personalView
      canReadAll={canReadAll}
      canWrite={can(user.role, "calendar:write")}
      canDelete={can(user.role, "calendar:delete")}
    />
  )
}
