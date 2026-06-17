'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        router.push('/admin')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Nesprávny e-mail alebo heslo')
      }
    } catch {
      setError('Chyba pri prihlásení')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#28170F] p-4">
      <Card className="w-full max-w-md bg-[#F5E3C2] border-[#8C6F4E]">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-[#28170F]">Admin Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#28170F]">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="vas@email.sk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white border-[#8C6F4E] text-[#28170F]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#28170F]">
                Heslo
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Heslo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white border-[#8C6F4E] text-[#28170F]"
                required
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <Button
              type="submit"
              className="w-full bg-[#E09E14] hover:bg-[#c88a10] text-[#28170F]"
              disabled={loading}
            >
              {loading ? 'Prihlasovanie...' : 'Prihlásiť sa'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
