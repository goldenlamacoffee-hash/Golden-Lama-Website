import { redirect } from "next/navigation"
import { ensureOwnerBootstrap, getCurrentUser } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { isBlobConfigured } from "@/lib/media"
import { MediaLibrary } from "@/components/admin/media-library"

export default async function AdminMediaPage() {
  await ensureOwnerBootstrap()
  const user = await getCurrentUser()

  if (!user) {
    redirect("/admin/login")
  }
  // Only users who can edit CMS content may manage media.
  if (!can(user.role, "cms:write")) {
    redirect("/admin")
  }

  return <MediaLibrary blobConfigured={isBlobConfigured()} />
}
