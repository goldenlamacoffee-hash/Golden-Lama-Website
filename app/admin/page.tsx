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

  // The mobile app admin is a separate system; only owner/admin may see the link.
  const appAdminUrl = process.env.APP_ADMIN_URL || 'https://admin.goldenlama.sk/'
  const canViewAppAdmin = user.role === 'owner' || user.role === 'admin'

  return (
    <AdminDashboard
      initialData={data}
      currentUser={{ name: user.name, email: user.email, role: user.role }}
      canEdit={can(user.role, 'cms:write')}
      canManageUsers={can(user.role, 'users:read')}
      canViewCalendar={can(user.role, 'calendar:read_all')}
      canViewOwnShifts={can(user.role, 'calendar:read_own')}
      canViewInventory={can(user.role, 'inventory:read')}
      canViewMotivation={can(user.role, 'motivation:read_all')}
      canViewOwnPoints={can(user.role, 'motivation:read_own')}
      canViewAppAdmin={canViewAppAdmin}
      appAdminUrl={appAdminUrl}
    />
  )
}
