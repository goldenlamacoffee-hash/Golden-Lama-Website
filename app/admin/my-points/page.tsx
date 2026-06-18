import { redirect } from "next/navigation"
import { ensureOwnerBootstrap, getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { MyPointsView } from "@/components/admin/my-points-view"

export default async function MyPointsPage() {
  await ensureOwnerBootstrap()
  const user = await getCurrentUser()

  if (!user) {
    redirect("/admin/login")
  }
  if (!can(user.role, "motivation:read_own")) {
    redirect("/admin")
  }

  return <MyPointsView currentUser={{ id: user.id, name: user.name, email: user.email }} />
}
