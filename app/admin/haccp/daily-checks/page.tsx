import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { getEquipment } from '@/lib/haccp'
import { DailyChecksPage } from '@/components/admin/haccp/daily-checks-page'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getCurrentUser()
  const equipment = await getEquipment()
  return (
    <DailyChecksPage
      canWrite={can(user!.role, 'haccp:write')}
      canCorrect={can(user!.role, 'haccp:correct')}
    />
  )
}
