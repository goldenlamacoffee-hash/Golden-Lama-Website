import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { TrainingPage } from '@/components/admin/haccp/training'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getCurrentUser()
  return <TrainingPage canWrite={can(user!.role, 'haccp:settings')} />
}
