import { redirect } from "next/navigation"
import { ensureOwnerBootstrap, getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { CalendarManager } from "@/components/admin/calendar-manager"

export default async function AdminCalendarPage() {
  await ensureOwnerBootstrap()
  const user = await getCurrentUser()

  if (!user) {
    redirect("/admin/login")
  }

  const canReadAll = can(user.role, "calendar:read_all")
  const canReadOwn = can(user.role, "calendar:read_own")

  // Staff (read_own only) get their personal view instead of the full planner.
  if (!canReadAll && canReadOwn) {
    redirect("/admin/my-shifts")
  }
  if (!canReadAll) {
    redirect("/admin")
  }

  return (
    <CalendarManager
      currentUser={{ id: user.id, name: user.name, email: user.email }}
      canReadAll
      canWrite={can(user.role, "calendar:write")}
      canDelete={can(user.role, "calendar:delete")}
    />
  )
}
