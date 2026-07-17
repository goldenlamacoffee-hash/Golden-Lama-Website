import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { MaintenancePage } from '@/components/admin/haccp/maintenance'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getCurrentUser()
  return <MaintenancePage canWrite={can(user!.role, 'haccp:write')} />
}
