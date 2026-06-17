import { redirect } from 'next/navigation'
import { ensureOwnerBootstrap, getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { AdminDashboard } from '@/components/admin/dashboard'
import { getSiteData } from '@/lib/data'

export default async function AdminPage() {
  await ensureOwnerBootstrap()
  const user = await getCurrentUser()

  if (!user) {
    redirect('/admin/login')
  }

  const data = await getSiteData()

  return (
    <AdminDashboard
      initialData={data}
      currentUser={{ name: user.name, email: user.email, role: user.role }}
      canEdit={can(user.role, 'cms:write')}
      canManageUsers={can(user.role, 'users:read')}
      canViewCalendar={can(user.role, 'calendar:read_all')}
      canViewOwnShifts={can(user.role, 'calendar:read_own')}
    />
  )
}
