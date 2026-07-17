import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { DiscardsPage } from '@/components/admin/haccp/discards'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getCurrentUser()
  return <DiscardsPage canWrite={can(user!.role, 'haccp:write')} />
}
