import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { ExportsPage } from '@/components/admin/haccp/exports'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getCurrentUser()
  if (!can(user!.role, 'haccp:exports')) redirect('/admin/haccp')
  return <ExportsPage />
}
