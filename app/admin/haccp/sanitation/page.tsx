import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { SanitationPage } from '@/components/admin/haccp/sanitation'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getCurrentUser()
  return (
    <SanitationPage canWrite={can(user!.role, 'haccp:write')} />
  )
}
