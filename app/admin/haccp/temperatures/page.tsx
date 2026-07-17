import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { getEquipment } from '@/lib/haccp'
import { TemperaturesPage } from '@/components/admin/haccp/temperatures-page'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getCurrentUser()
  const equipment = await getEquipment()
  return (
    <TemperaturesPage
      equipment={equipment}
      canWrite={can(user!.role, 'haccp:write')}
    />
  )
}
