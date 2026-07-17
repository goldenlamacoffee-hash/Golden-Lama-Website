import { redirect } from 'next/navigation'
import { ensureOwnerBootstrap, getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { HaccpShell } from '@/components/admin/haccp/haccp-shell'

export default async function HaccpLayout({ children }: { children: React.ReactNode }) {
  await ensureOwnerBootstrap()
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')
  if (!can(user.role, 'haccp:view')) redirect('/admin')

  return (
    <HaccpShell
      userName={user.name}
      userRole={user.role}
      canWrite={can(user.role, 'haccp:write')}
      canSettings={can(user.role, 'haccp:settings')}
      canExports={can(user.role, 'haccp:exports')}
    >
      {children}
    </HaccpShell>
  )
}
