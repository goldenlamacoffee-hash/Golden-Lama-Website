import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { getHaccpDashboard } from '@/lib/haccp'
import { HaccpDashboard } from '@/components/admin/haccp/haccp-dashboard'

export const dynamic = 'force-dynamic'

export default async function HaccpPage() {
  const user = await getCurrentUser()
  const today = new Date().toISOString().slice(0, 10)
  const summary = await getHaccpDashboard(today)

  return (
    <HaccpDashboard
      summary={summary}
      today={today}
      canWrite={can(user!.role, 'haccp:write')}
      canSettings={can(user!.role, 'haccp:settings')}
    />
  )
}
