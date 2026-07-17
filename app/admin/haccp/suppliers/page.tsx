import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { SuppliersPage } from '@/components/admin/haccp/suppliers'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getCurrentUser()
  return <SuppliersPage canWrite={can(user!.role, 'haccp:settings')} />
}
