import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { ReceivingPage } from '@/components/admin/haccp/receiving'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getCurrentUser()
  return <ReceivingPage canWrite={can(user!.role, 'haccp:write')} />
}
