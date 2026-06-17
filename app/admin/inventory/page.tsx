import { redirect } from "next/navigation"
import { ensureOwnerBootstrap, getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { InventoryManager } from "@/components/admin/inventory-manager"

export default async function AdminInventoryPage() {
  await ensureOwnerBootstrap()
  const user = await getCurrentUser()

  if (!user) {
    redirect("/admin/login")
  }
  if (!can(user.role, "inventory:read")) {
    redirect("/admin")
  }

  return (
    <InventoryManager
      currentUser={{ id: user.id, name: user.name, email: user.email }}
      canWrite={can(user.role, "inventory:write")}
      canDelete={can(user.role, "inventory:delete")}
    />
  )
}
