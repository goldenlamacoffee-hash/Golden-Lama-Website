import { cookies } from 'next/headers'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

export async function verifyAuth(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  return token === 'authenticated'
}

export function checkPassword(password: string): boolean {
  return password === ADMIN_PASSWORD
}
