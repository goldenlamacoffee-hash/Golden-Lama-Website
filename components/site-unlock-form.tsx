"use client"

import { useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Only allow same-origin, absolute internal paths as a post-unlock redirect
// target, to avoid open-redirect issues.
function safeNext(next: string | null): string {
  if (!next) return "/"
  if (!next.startsWith("/") || next.startsWith("//")) return "/"
  return next
}

export function SiteUnlockForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNext(searchParams.get("next"))

  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/site-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.replace(next)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Nesprávne heslo.")
      }
    } catch {
      setError("Niečo sa pokazilo. Skúste to znova.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center text-center">
        <Image
          src="/logo.png"
          alt="Golden Lama Coffee"
          width={88}
          height={88}
          className="rounded-full ring-2 ring-[#E09E14]/40"
          priority
        />
        <h1 className="mt-6 font-heading text-2xl text-[#F5E3C2] text-balance">Golden Lama Coffee</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#C9A87C] text-pretty">
          Táto stránka je dočasne chránená heslom. Zadajte heslo pre vstup.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="site-password" className="text-[#F5E3C2]">
            Heslo
          </Label>
          <Input
            id="site-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            placeholder="Zadajte heslo"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-[#3a251a] border-[#8C6F4E]/60 text-[#F5E3C2] placeholder:text-[#8C6F4E]"
            required
          />
        </div>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#E09E14] hover:bg-[#c88a10] text-[#28170F] font-medium"
        >
          <Lock className="h-4 w-4 mr-2" />
          {loading ? "Overujem..." : "Vstúpiť"}
        </Button>
      </form>
    </div>
  )
}
