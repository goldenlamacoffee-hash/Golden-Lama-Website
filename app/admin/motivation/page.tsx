import { redirect } from "next/navigation"
import { ensureOwnerBootstrap, getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { MotivationManager } from "@/components/admin/motivation-manager"

export default async function AdminMotivationPage() {
  await ensureOwnerBootstrap()
  const user = await getCurrentUser()

  if (!user) {
    redirect("/admin/login")
  }
  if (!can(user.role, "motivation:read_all")) {
    redirect("/admin")
  }

  return (
    <MotivationManager
      currentUser={{ id: user.id, name: user.name, email: user.email }}
      canWrite={can(user.role, "motivation:write")}
      canWriteNegative={can(user.role, "motivation:write_negative")}
      canManageRules={can(user.role, "motivation:manage_rules")}
      canManageSettings={can(user.role, "motivation:manage_settings")}
    />
  )
}
