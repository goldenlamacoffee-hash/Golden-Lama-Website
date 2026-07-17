import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { TemperaturesPage } from '@/components/admin/haccp/temperatures'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getCurrentUser()
  return (
    <TemperaturesPage
      canWrite={can(user!.role, 'haccp:write')}
    />
  )
}
