import { NextResponse, type NextRequest } from "next/server"
import { cookies } from "next/headers"
import { SITE_ACCESS_COOKIE, SITE_ACCESS_TTL_SECONDS, computeAccessToken } from "@/lib/site-gate"

export async function POST(request: NextRequest) {
  const sitePassword = process.env.SITE_PASSWORD
  if (!sitePassword) {
    // Nothing to protect — treat as already unlocked.
    return NextResponse.json({ ok: true })
  }

  let password = ""
  try {
    const body = await request.json()
    password = typeof body?.password === "string" ? body.password : ""
  } catch {
    password = ""
  }

  if (password !== sitePassword) {
    return NextResponse.json({ error: "Nesprávne heslo." }, { status: 401 })
  }

  const token = await computeAccessToken(sitePassword)
  const cookieStore = await cookies()
  cookieStore.set(SITE_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SITE_ACCESS_TTL_SECONDS,
    path: "/",
  })

  return NextResponse.json({ ok: true })
}
