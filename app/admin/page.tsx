import { redirect } from 'next/navigation'
import { verifyAuth } from '@/lib/auth'
import { AdminDashboard } from '@/components/admin/dashboard'
import { getSiteData } from '@/lib/data'

export default async function AdminPage() {
  const isAuth = await verifyAuth()
  
  if (!isAuth) {
    redirect('/admin/login')
  }

  const data = await getSiteData()

  return <AdminDashboard initialData={data} />
}
