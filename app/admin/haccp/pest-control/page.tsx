import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { PestControlPage } from '@/components/admin/haccp/pest-control'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getCurrentUser()
  return <PestControlPage canWrite={can(user!.role, 'haccp:write')} />
}
