import { redirect } from "next/navigation"
import { ensureOwnerBootstrap, getCurrentUser } from "@/lib/auth"
import { listUsers } from "@/lib/users"
import {
  can,
  canManageRole,
  ROLES,
  type AdminRole,
  type Capability,
} from "@/lib/permissions"
import { UsersManager } from "@/components/admin/users-manager"

export default async function AdminUsersPage() {
  await ensureOwnerBootstrap()
  const user = await getCurrentUser()

  if (!user) {
    redirect("/admin/login")
  }
  if (!can(user.role, "users:read")) {
    redirect("/admin")
  }

  const users = await listUsers()

  const assignableRoles: AdminRole[] = ROLES.filter((r) => canManageRole(user.role, r))

  const capabilities: Capability[] = (
    ["cms:read", "cms:write", "users:read", "users:write", "users:manage_admins"] as Capability[]
  ).filter((c) => can(user.role, c))

  return (
    <UsersManager
      currentUser={{ id: user.id, email: user.email, name: user.name, role: user.role }}
      initialUsers={users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
      }))}
      assignableRoles={assignableRoles}
      capabilities={capabilities}
    />
  )
}
