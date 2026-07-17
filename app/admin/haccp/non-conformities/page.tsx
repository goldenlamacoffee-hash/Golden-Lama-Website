import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { NonConformitiesPage } from '@/components/admin/haccp/non-conformities'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getCurrentUser()
  return <NonConformitiesPage canWrite={can(user!.role, 'haccp:write')} />
}
