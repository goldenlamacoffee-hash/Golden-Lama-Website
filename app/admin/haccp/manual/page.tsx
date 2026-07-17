import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { ManualPage } from '@/components/admin/haccp/manual'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getCurrentUser()
  return <ManualPage canWrite={can(user!.role, 'haccp:settings')} />
}
