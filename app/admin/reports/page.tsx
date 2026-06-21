import { redirect } from "next/navigation"
import { ensureOwnerBootstrap, getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { ReportsManager } from "@/components/admin/reports-manager"

export default async function AdminReportsPage() {
  await ensureOwnerBootstrap()
  const user = await getCurrentUser()

  if (!user) {
    redirect("/admin/login")
  }
  if (!can(user.role, "reports:view")) {
    redirect("/admin")
  }

  return (
    <ReportsManager
      currentUser={{ id: user.id, name: user.name, email: user.email }}
      access={{
        shifts: can(user.role, "reports:shifts"),
        absences: can(user.role, "reports:absences"),
        points: can(user.role, "reports:points"),
        inventory: can(user.role, "reports:inventory"),
        users: can(user.role, "reports:users"),
      }}
    />
  )
}
