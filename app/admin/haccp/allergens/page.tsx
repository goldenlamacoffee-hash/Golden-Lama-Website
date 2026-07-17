import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { AllergensPage } from '@/components/admin/haccp/allergens'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getCurrentUser()
  return <AllergensPage canWrite={can(user!.role, 'haccp:settings')} />
}
