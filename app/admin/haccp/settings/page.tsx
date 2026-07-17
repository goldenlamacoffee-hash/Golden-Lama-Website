import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { SettingsPage } from '@/components/admin/haccp/settings'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getCurrentUser()
  if (!can(user!.role, 'haccp:settings')) redirect('/admin/haccp')
  return <SettingsPage canWrite={can(user!.role, 'haccp:settings')} />
}
