import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { WaterPage } from '@/components/admin/haccp/water-page'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getCurrentUser()
  return (
    <WaterPage canWrite={can(user!.role, 'haccp:write')} />
  )
}
